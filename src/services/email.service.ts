import { EmailClient } from '@azure/communication-email';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let emailClient: EmailClient | null = null;

/**
 * Initialize Azure Communication Services Email client
 */
export function initializeEmailClient(): void {
  if (!env.email.azureConnectionString) {
    logger.warn('Azure Communication Services connection string not provided. Email service will be disabled.');
    return;
  }

  try {
    emailClient = new EmailClient(env.email.azureConnectionString);
    logger.info('Azure Communication Services Email client initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize email client');
    throw error;
  }
}

/**
 * Check if email service is available
 */
export function isEmailServiceAvailable(): boolean {
  return emailClient !== null && env.email.senderEmail !== undefined;
}

/**
 * Send an email using Azure Communication Services
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<void> {
  if (!isEmailServiceAvailable()) {
    throw new Error('Email service is not configured');
  }

  if (!emailClient) {
    throw new Error('Email client not initialized');
  }

  try {
    const emailMessage = {
      senderAddress: env.email.senderEmail!,
      content: {
        subject,
        html: htmlContent,
        plainText: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      },
      recipients: {
        to: [{ address: to }],
      },
    };

    const poller = await emailClient.beginSend(emailMessage);
    const result = await poller.pollUntilDone();

    logger.info(
      {
        messageId: result.id,
        to,
        subject,
      },
      'Email sent successfully'
    );
  } catch (error) {
    logger.error({ error, to, subject }, 'Failed to send email');
    throw error;
  }
}

/**
 * Generate HTML email template for password reset
 */
export function generatePasswordResetEmail(resetLink: string, expiresInMinutes: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h1 style="color: #2c3e50;">Password Reset Request</h1>
    <p>You have requested to reset your password. Click the button below to proceed:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" 
         style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color: #7f8c8d; font-size: 14px;">
      This link will expire in ${expiresInMinutes} minutes.
    </p>
    <p style="color: #7f8c8d; font-size: 14px;">
      If you did not request this password reset, please ignore this email or contact support if you have concerns.
    </p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #95a5a6; font-size: 12px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetLink}" style="color: #3498db; word-break: break-all;">${resetLink}</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML email template for OTP login
 */
export function generateOTPEmail(otpCode: string, expiresInMinutes: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h1 style="color: #2c3e50;">Your Login Code</h1>
    <p>Use the following code to complete your login:</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #ecf0f1; border: 2px dashed #3498db; padding: 20px; border-radius: 5px; display: inline-block;">
        <h2 style="color: #2c3e50; margin: 0; font-size: 36px; letter-spacing: 5px; font-family: 'Courier New', monospace;">
          ${otpCode}
        </h2>
      </div>
    </div>
    <p style="color: #7f8c8d; font-size: 14px;">
      This code will expire in ${expiresInMinutes} minutes.
    </p>
    <p style="color: #7f8c8d; font-size: 14px;">
      If you did not request this login code, please ignore this email or contact support if you have concerns.
    </p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #95a5a6; font-size: 12px;">
      For security reasons, never share this code with anyone.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  expiresInMinutes: number = 60
): Promise<void> {
  const subject = 'Password Reset Request';
  const htmlContent = generatePasswordResetEmail(resetLink, expiresInMinutes);
  
  await sendEmail(email, subject, htmlContent);
}

/**
 * Send OTP email
 */
export async function sendOTPEmail(
  email: string,
  otpCode: string,
  expiresInMinutes: number = 10
): Promise<void> {
  const subject = 'Your Login Code';
  const htmlContent = generateOTPEmail(otpCode, expiresInMinutes);
  
  await sendEmail(email, subject, htmlContent);
}

