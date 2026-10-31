import { afterEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
vi.mock('../../middleware/logger.js', () => ({logger:{info:vi.fn(),warn:vi.fn(),error:vi.fn()}}));
import Email from '../../utils/email.js';

afterEach(() => vi.unstubAllEnvs());
describe('production mail transport', () => {
  it('requires real credentials rather than using the development placeholder', () => {
    vi.stubEnv('NODE_ENV','production');
    vi.stubEnv('EMAIL_USERNAME','');
    vi.stubEnv('EMAIL_PASSWORD','');
    expect(() => new Email({email:'customer@example.test'},'https://example.test').newTransport()).toThrow('not configured');
  });
  it('disables file and URL content access on the installed transport', () => {
    vi.stubEnv('EMAIL_USERNAME','sender@example.test');
    vi.stubEnv('EMAIL_PASSWORD','test-only');
    const transport = new Email({email:'customer@example.test'},'https://example.test').newTransport();
    expect(transport.options).toMatchObject({disableFileAccess:true,disableUrlAccess:true});
    transport.close();
  });
  it('compiles a message with the upgraded mailer without contacting SMTP', async () => {
    const transport = nodemailer.createTransport({streamTransport:true,buffer:true,disableFileAccess:true,disableUrlAccess:true});
    const result = await transport.sendMail({from:'sender@example.test',to:'customer@example.test',subject:'Verify your account',text:'Verification link',html:'<p>Verification link</p>'});
    expect(result.message.toString()).toContain('Subject: Verify your account');
    expect(result.envelope.to).toEqual(['customer@example.test']);
    transport.close();
  });
});
