import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let emailTransporter: Transporter | null = null;

/**
 * Initialize nodemailer SMTP transporter
 */
export function initializeEmailClient(): void {
  if (!env.email.smtp.host || !env.email.from.email) {
    logger.warn('SMTP configuration not provided. Email service will be disabled.');
    return;
  }

  try {
    emailTransporter = nodemailer.createTransport({
      host: env.email.smtp.host,
      port: env.email.smtp.port,
      secure: env.email.smtp.secure, // true for 465, false for other ports
      auth: env.email.smtp.user && env.email.smtp.password ? {
        user: env.email.smtp.user,
        pass: env.email.smtp.password,
      } : undefined,
    });

    logger.info('Nodemailer SMTP transporter initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize email transporter');
    throw error;
  }
}

/**
 * Check if email service is available
 */
export function isEmailServiceAvailable(): boolean {
  return emailTransporter !== null && env.email.from.email !== undefined;
}

/**
 * Send an email using nodemailer
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

  if (!emailTransporter) {
    throw new Error('Email transporter not initialized');
  }

  try {
    const mailOptions = {
      from: {
        name: env.email.from.name,
        address: env.email.from.email!,
      },
      to,
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
    };

    const info = await emailTransporter.sendMail(mailOptions);

    logger.info(
      {
        messageId: info.messageId,
        to,
        subject,
        response: info.response,
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

/**
 * Generate HTML email template for client secret
 */
export function generateClientSecretEmail(
  appName: string,
  clientId: string,
  clientSecret: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Client Secret</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h1 style="color: #2c3e50;">🔐 Confidential App Credentials</h1>
    <p>Your application <strong>${appName}</strong> has been updated to <strong>CONFIDENTIAL</strong> type.</p>
    <p>A new client secret has been generated. Please store this securely as it will not be shown again.</p>
    
    <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e74c3c;">
      <h3 style="color: #e74c3c; margin-top: 0;">⚠️ Important Security Information</h3>
      <p style="margin: 10px 0;"><strong>Application Name:</strong> ${appName}</p>
      <p style="margin: 10px 0;"><strong>Client ID:</strong></p>
      <code style="background-color: #ecf0f1; padding: 8px 12px; border-radius: 3px; display: block; margin: 5px 0; word-break: break-all; font-family: 'Courier New', monospace;">${clientId}</code>
      
      <p style="margin: 10px 0;"><strong>Client Secret:</strong></p>
      <code style="background-color: #ffe6e6; padding: 8px 12px; border-radius: 3px; display: block; margin: 5px 0; word-break: break-all; font-family: 'Courier New', monospace; color: #c0392b;">${clientSecret}</code>
    </div>

    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <h4 style="color: #856404; margin-top: 0;">🔒 Security Best Practices</h4>
      <ul style="color: #856404; margin: 0; padding-left: 20px;">
        <li>Store this secret in a secure location (e.g., password manager, secrets vault)</li>
        <li>Never commit this secret to version control</li>
        <li>Use environment variables to store it in your application</li>
        <li>This secret will be required for all API requests from your app</li>
        <li>If compromised, contact support immediately to rotate the secret</li>
      </ul>
    </div>

    <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
      <h4 style="color: #0c5460; margin-top: 0;">📝 Usage Example</h4>
      <p style="color: #0c5460; margin: 5px 0;">Include both credentials in your authentication requests:</p>
      <pre style="background-color: #fff; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px;"><code>{
  "client_id": "${clientId}",
  "client_secret": "${clientSecret}",
  ...
}</code></pre>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #95a5a6; font-size: 12px;">
      This is an automated message. If you did not request this change or have any concerns, please contact support immediately.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send client secret email
 */
export async function sendClientSecretEmail(
  email: string,
  appName: string,
  clientId: string,
  clientSecret: string
): Promise<void> {
  const subject = `🔐 Client Secret for ${appName}`;
  const htmlContent = generateClientSecretEmail(appName, clientId, clientSecret);
  
  await sendEmail(email, subject, htmlContent);
}

