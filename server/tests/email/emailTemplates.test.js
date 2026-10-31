import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
vi.mock('../../middleware/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
import Email from '../../utils/email.js';
import { orderEmailData } from '../../utils/emailData.js';

const order = {
  id: 'e97fa0f6-3931-4f61-b195-9ff00b839629', total_price: '1249.95',
  items_price: '1200.00', discount_amount: '10', shipping_price: '9.95', tax_price: '50',
  payment_method: 'cod', is_paid: false,
  orderItems: [{ name: 'Forge GPU <Limited & Special>', price: '600', quantity: 2 }],
};
const url = `https://customforge.example/orders/${order.id}`;
let sendMail;
beforeEach(() => {
  vi.stubEnv('EMAIL_USERNAME', 'mailer@example.test');
  vi.stubEnv('EMAIL_FROM', 'Old Brand <sender@example.test>');
  sendMail = vi.fn().mockResolvedValue({ messageId: 'captured-test' });
  vi.spyOn(Email.prototype, 'newTransport').mockReturnValue({ sendMail });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const mailer = (actionUrl = url) => new Email({ email: 'customer@example.test', name: 'Player <script>' }, actionUrl);
const lastMail = () => sendMail.mock.calls.at(-1)[0];

describe('real CustomForge email rendering and transport payload', () => {
  it('passes checkout RPC order locals to both HTML and text without zero/N/A fallbacks', async () => {
    await mailer().sendOrderConfirmation(order);
    const message = lastMail();
    expect(message.from).toEqual({ name: 'CustomForge', address: 'sender@example.test' });
    expect(message.subject).toBe('CustomForge order #E97FA0F6 received');
    for (const body of [message.html, message.text]) {
      expect(body).toContain(order.id);
      expect(body).toContain('$1,249.95');
      expect(body).toContain('Due on delivery');
      expect(body).not.toMatch(/N\/A|GameShop|\$0\.00|undefined/);
    }
    expect(message.html).toContain('Forge GPU &lt;Limited &amp; Special&gt;');
    expect(message.html).toContain(`href="${url}"`);
    expect(message.html).not.toContain('<script>');
    expect(message.text).toContain('Forge GPU <Limited & Special>');
    expect(message.text).toMatch(/Subtotal\s+\$1,200\.00/);
    expect(message.text).toMatch(/Total \(USD\)\s+\$1,249\.95/);
    expect(message.text).not.toContain('LOADOUT / ORDER RECEIVED\nOrder #');
    const transport = nodemailer.createTransport({streamTransport:true,buffer:true});
    const compiled = await transport.sendMail(message);
    expect(compiled.message.toString()).toContain('multipart/alternative');
    transport.close();
  });

  it.each([
    ['welcome', m => m.sendWelcome(), 'Explore the store'],
    ['signup', m => m.sendWelcome({ verifyEmail: true }), 'Verify my email'],
    ['verification', m => m.sendVerificationEmail(), 'Verify my email'],
    ['reset', m => m.sendPasswordReset(), 'Reset my password'],
    ['cancellation', m => m.sendOrderCancellation({ ...order, status: 'cancelled' }), 'View my order'],
    ['return', m => m.sendReturnRequest({ ...order, return_status: 'requested' }), 'View return status'],
  ])('renders %s with shared branding and a usable action', async (_name, send, label) => {
    await send(mailer('https://customforge.example/account/action?token=a&source=email'));
    const { html, text } = lastMail();
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('max-width:600px');
    expect(html).toContain('color:#101426 !important');
    expect(html).toContain('href="https://customforge.example/account/action?token=a&amp;source=email"');
    expect(text).toContain(label);
    expect(html).not.toMatch(/GameShop|N\/A|undefined|display:\s*flex/);
    expect(html.length).toBeLessThan(90000);
  });

  it('never represents an unpaid Stripe order as paid', async () => {
    await mailer().sendOrderConfirmation({ ...order, payment_method: 'stripe' });
    expect(lastMail().text).toContain('Awaiting payment');
    expect(lastMail().text).toContain('payment is not yet confirmed');
    expect(lastMail().text).not.toContain('Payment confirmed');
    await mailer().sendOrderConfirmation({ ...order, payment_method: 'stripe', is_paid: true });
    expect(lastMail().text).toContain('Payment confirmed');
  });

  it('supports normalized DTOs and preserves a legitimate zero total', () => {
    expect(orderEmailData({ id: order.id, total: 0, isPaid: false, paymentMethod: 'cod', items: [] }))
      .toMatchObject({ total: '$0.00', paymentStatus: 'Due on delivery' });
  });

  it.each([{}, { id: order.id }, { id: order.id, total_price: '' }, { id: order.id, total_price: -1 }, { id: order.id, total_price: 'NaN' }])
    ('rejects incomplete or invalid persisted order data before sending: %j', async invalid => {
      await expect(mailer().sendOrderConfirmation(invalid)).rejects.toThrow();
      expect(sendMail).not.toHaveBeenCalled();
    });

  it.each(['javascript:alert(1)', 'data:text/html,test', 'http://untrusted.example/test', 'https://user:pass@example.test', 'undefined/orders/123'])
    ('rejects unsafe or malformed action URL %s', async unsafe => {
      await expect(mailer(unsafe).sendWelcome()).rejects.toThrow();
      expect(sendMail).not.toHaveBeenCalled();
    });

  it('requires persisted cancellation/return states and makes no refund promise', async () => {
    await expect(mailer().sendOrderCancellation({ ...order, status: 'pending' })).rejects.toThrow();
    await expect(mailer().sendReturnRequest({ ...order, return_status: 'none' })).rejects.toThrow();
    expect(sendMail).not.toHaveBeenCalled();
    await mailer().sendOrderCancellation({ ...order, status: 'cancelled', refundAmount: 999 });
    expect(lastMail().text).toContain('does not confirm a refund');
    expect(lastMail().text).not.toContain('999');
  });

  it('propagates SMTP failures rather than reporting success', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await expect(mailer().sendVerificationEmail()).rejects.toThrow('Failed to send email');
  });
});
