// server/utils/email.js
import nodemailer from "nodemailer";
import addressparser from "nodemailer/lib/addressparser/index.js";
import pug from "pug";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import net from "node:net";
import {randomUUID} from "node:crypto";
import AppError from "./appError.js";
import { logger } from "../middleware/logger.js";
import { emailPlainText, orderEmailData, safeEmailUrl } from "./emailData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class Email {
  constructor(user, url, data = {}) {
    this.to = user.email;
    this.firstName = user.name?.split(" ")[0] || "User";
    this.url = url;
    this.from = {
      name: "CustomForge",
      address: addressparser(process.env.EMAIL_FROM || process.env.EMAIL_USERNAME || '')[0]?.address,
    };
    this.data = data;
    this.messageId = data.messageId;
    this.signal = data.signal;
  }

  /**
   * Create a secure transport for sending emails.
   */
  newTransport() {
    const { EMAIL_USERNAME, EMAIL_PASSWORD, EMAIL_HOST, EMAIL_PORT, NODE_ENV } =
      process.env;

    if (NODE_ENV === "development" && process.env.EMAIL_MODE === "preview") {
      return { sendMail: async options => {
        const directory = process.env.EMAIL_PREVIEW_DIR || fileURLToPath(new URL('../../.local/mailbox/', import.meta.url));
        await fs.promises.mkdir(directory, {recursive:true});
        const filename = `${Date.now()}-${randomUUID()}.html`;
        await fs.promises.writeFile(path.join(directory,filename), options.html, {flag:'wx',mode:0o600});
        logger.info('Development email saved to local mailbox', {filename});
        return {messageId:filename};
      }};
    }

    // In development, allow email to be optional (log instead of sending)
    if (NODE_ENV === "development" && (!EMAIL_USERNAME || !EMAIL_PASSWORD)) {
      logger.warn(
        "Email not configured - emails will not be sent in development",
        {
          hasUsername: !!EMAIL_USERNAME,
          hasPassword: !!EMAIL_PASSWORD,
        }
      );
      // Return a mock transport that logs instead of sending
      return {
        sendMail: async (options) => {
          logger.info("📧 [DEV MODE] Email would be sent", {
            to: options.to,
            subject: options.subject,
            from: options.from,
          });
          return { messageId: "dev-mode-mock-id" };
        },
      };
    }

    if (!EMAIL_USERNAME || !EMAIL_PASSWORD) {
      logger.error("Email transport misconfigured: missing credentials", {
        hasUsername: !!EMAIL_USERNAME,
        hasPassword: !!EMAIL_PASSWORD,
        nodeEnv: NODE_ENV,
      });
      throw new AppError(
        "Email service is not configured correctly. Please set EMAIL_USERNAME and EMAIL_PASSWORD environment variables.",
        500
      );
    }

    const host = EMAIL_HOST || "smtp.gmail.com";
    const port = Number(EMAIL_PORT) || 465; // 465 with secure: true

    try {
      return nodemailer.createTransport({
        host,
        port,
        disableFileAccess: true,
        disableUrlAccess: true,
        secure: port === 465, // true for 465, false for other ports
        requireTLS: port !== 465, // Never authenticate over a plaintext SMTP connection.
        tls: { rejectUnauthorized: true },
        auth: {
          user: EMAIL_USERNAME,
          pass: EMAIL_PASSWORD,
        },
        // SMTPTransport.close() does not destroy an active connection. Own the
        // TCP socket for cancellable outbox sends; Nodemailer still performs its
        // normal verified TLS/STARTTLS upgrade on this supplied connection.
        ...(this.signal ? { getSocket: (options, callback) => {
          if (this.signal.aborted) return callback(this.signal.reason);
          const socket = net.createConnection({ host: options.host, port: options.port, signal: this.signal });
          let connected = false;
          socket.once("error", error => { if (!connected) callback(error); });
          socket.once("connect", () => {
            if (this.signal.aborted) { socket.destroy(); return; }
            connected = true;
            callback(null, { connection: socket, secured: false });
          });
        } } : {}),
        // Connection timeout
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
    } catch (transportError) {
      logger.error("Failed to create email transport", {
        error: transportError.message,
        host,
        port,
      });
      throw new AppError(
        `Failed to configure email transport: ${transportError.message}`,
        500
      );
    }
  }

  async send(template, subject, data = {}) {
    try {
      this.signal?.throwIfAborted();
      const templatePath = path.join(
        __dirname,
        `../views/email/${template}.pug`
      );

      // Check if template file exists
      if (!fs.existsSync(templatePath)) {
        logger.error("Email template not found", { templatePath, template });
        throw new AppError(`Email template '${template}' not found`, 500, {
          templatePath,
        });
      }

      // Render HTML based on pug template
      let html;
      try {
        html = pug.renderFile(templatePath, {
          ...this.data,
          ...data,
          firstName: this.firstName,
          url: safeEmailUrl(this.url),
          subject,
          year: new Date().getUTCFullYear(),
        });
      } catch (renderError) {
        logger.error("Email template rendering failed", {
          error: renderError.message,
          template,
          templatePath,
        });
        throw new AppError(
          `Failed to render email template: ${renderError.message}`,
          500,
          { template, originalError: renderError.message }
        );
      }

      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: emailPlainText(html),
        ...(this.messageId ? { messageId: this.messageId } : {}),
      };

      // Create transport and send
      const transport = this.newTransport();
      let onAbort;

      try {
        this.signal?.throwIfAborted();
        const cancelled = this.signal && new Promise((_resolve, reject) => {
          onAbort = () => {
            transport.close?.();
            reject(this.signal.reason);
          };
          this.signal.addEventListener("abort", onAbort, { once: true });
        });
        const delivery = transport.sendMail(mailOptions);
        await (cancelled ? Promise.race([delivery, cancelled]) : delivery);
      } catch (sendError) {
        logger.error("Nodemailer send failed", {
          error: sendError.message,
          code: sendError.code,
          command: sendError.command,
          response: sendError.response,
          to: this.to,
        });

        // Provide more specific error messages
        let errorMessage = "Failed to send email";
        if (sendError.code === "EAUTH") {
          errorMessage =
            "Email authentication failed. Please check EMAIL_USERNAME and EMAIL_PASSWORD.";
        } else if (sendError.code === "ECONNECTION") {
          errorMessage = `Cannot connect to email server (${
            process.env.EMAIL_HOST || "smtp.gmail.com"
          })`;
        } else if (sendError.code === "ETIMEDOUT") {
          errorMessage = "Email server connection timed out";
        } else if (sendError.response) {
          errorMessage = `Email server error: ${sendError.response}`;
        }

        throw new AppError(errorMessage, 500, {
          template,
          recipient: this.to,
          errorCode: sendError.code,
          originalError: sendError.message,
        });
      } finally {
        if (onAbort) this.signal.removeEventListener("abort", onAbort);
        transport.close?.();
      }

      logger.info("Email sent successfully", {
        to: this.to,
        subject,
        template,
      });
    } catch (err) {
      // Re-throw AppError as-is
      if (err instanceof AppError) {
        throw err;
      }

      // Wrap other errors
      logger.error("Email send failed (unexpected error)", {
        message: err.message,
        stack: err.stack,
        to: this.to,
        subject,
        template,
      });
      throw new AppError(`Error sending email: ${err.message}`, 500, {
        template,
        recipient: this.to,
        originalError: err.message,
      });
    }
  }

  async sendWelcome({ verifyEmail = false } = {}) {
    await this.send("welcome", "Welcome to CustomForge — gear up", { verifyEmail });
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Reset your CustomForge password"
    );
  }

  async sendOrderConfirmation(order) {
    const data = orderEmailData(order);
    await this.send("orderConfirmation", `CustomForge order #${data.shortOrderId} received`, data);
  }

  async sendVerificationEmail() {
    await this.send("emailVerification", "Verify your CustomForge email");
  }

  // These templates are available for future post-commit notifications. They do
  // not initiate cancellations, returns or refunds, or change payment state.
  async sendOrderCancellation(order) {
    if (order?.status !== 'cancelled') throw new AppError('Order cancellation is not confirmed', 500);
    const data = orderEmailData(order);
    await this.send('orderCancellation', `CustomForge order #${data.shortOrderId} cancelled`, data);
  }

  async sendReturnRequest(order) {
    if ((order?.return_status ?? order?.returnStatus) !== 'requested') throw new AppError('Return request is not confirmed', 500);
    const data = orderEmailData(order);
    await this.send('returnRequest', `Return requested for CustomForge order #${data.shortOrderId}`, data);
  }
}
