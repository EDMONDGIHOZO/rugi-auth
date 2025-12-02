import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let emailTransporter: Transporter | null = null;

/**
 * Common footer appended to all transactional emails
 * Helps recipients verify the email really comes from Ruigi Auth.
 */
function generateGlobalEmailFooter(): string {
  const companyEmail = env.email.from.email || "support@rugi.app";
  const companyAddress = "KK 771 St";
  const appNames = ["Ruigi Auth"];

  const appsRow = appNames
    .map(
      (name) =>
        `<span style="margin-right: 12px; padding: 4px 8px; border-radius: 12px; background-color: #050E3C; font-size: 12px; color: #ffffff;">${name}</span>`
    )
    .join("");

  return `
  <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
  <div style="font-size: 12px; color: #002455;">
    <p style="margin: 4px 0; color: #050E3C;"><strong>Ruigi Auth</strong></p>
    <p style="margin: 4px 0;">${companyAddress}</p>
    <p style="margin: 4px 0;">Contact: <a href="mailto:${companyEmail}" style="color: #FF3838;">${companyEmail}</a></p>
    <p style="margin: 12px 0 4px 0;">Official Ruigi Auth applications:</p>
    <div style="margin-top: 4px;">
      ${appsRow}
    </div>
    <p style="margin-top: 12px;">
      If an email claiming to be from Ruigi Auth does not contain this section, please treat it with caution.
    </p>
  </div>
  `.trim();
}

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
 * Generate HTML email template for password reset using OTP code
 */
export function generatePasswordResetOTPEmail(
  otpCode: string,
  expiresInMinutes: number
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #002455; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h1 style="color: #050E3C;">Password Reset Request</h1>
    <p>You have requested to reset your password.</p>
    <p>Use the following code to complete your password reset:</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #050E3C; border: 2px dashed #002455; padding: 20px; border-radius: 5px; display: inline-block;">
        <h2 style="color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 5px; font-family: 'Courier New', monospace;">
          ${otpCode}
        </h2>
      </div>
    </div>
    <p style="color: #002455; font-size: 14px;">
      This code will expire in ${expiresInMinutes} minutes.
    </p>
    <p style="color: #002455; font-size: 14px;">
      If you did not request this password reset, please ignore this email or contact support if you have concerns.
    </p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #002455; font-size: 12px;">
      For security reasons, never share this code with anyone.
    </p>
  </div>
  ${generateGlobalEmailFooter()}
</body>
</html>
  `.trim();
}

/**
 * Generate HTML email template for OTP login
 */
export function generateOTPEmail(
  otpCode: string,
  expiresInMinutes: number
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #002455; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h1 style="color: #050E3C;">Your Login Code</h1>
    <p>Use the following code to complete your login:</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #050E3C; border: 2px dashed #002455; padding: 20px; border-radius: 5px; display: inline-block;">
        <h2 style="color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 5px; font-family: 'Courier New', monospace;">
          ${otpCode}
        </h2>
      </div>
    </div>
    <p style="color: #002455; font-size: 14px;">
      This code will expire in ${expiresInMinutes} minutes.
    </p>
    <p style="color: #002455; font-size: 14px;">
      If you did not request this login code, please ignore this email or contact support if you have concerns.
    </p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #002455; font-size: 12px;">
      For security reasons, never share this code with anyone.
    </p>
  </div>
  ${generateGlobalEmailFooter()}
</body>
</html>
  `.trim();
}

/**
 * Generate HTML email template for user invite / welcome
 */
export function generateUserInviteEmail(params: {
  email: string;
  apps: { id: string; name: string }[];
  generatedPassword: string | null;
  isNewUser: boolean;
}): string {
  const appListHtml = params.apps
    .map((app) => `<li><strong>${app.name}</strong></li>`)
    .join("");

  const passwordSection = params.generatedPassword
    ? `
    <h2 style="color: #050E3C; margin-top: 0;">Your Temporary Password</h2>
    <p style="margin: 10px 0;">A secure password has been generated for your account:</p>
    <code style="background-color: #ecf0f1; padding: 8px 12px; border-radius: 3px; display: inline-block; margin: 5px 0; word-break: break-all; font-family: 'Courier New', monospace;">
      ${params.generatedPassword}
    </code>
    <p style="color: #DC0000; font-size: 13px; margin-top: 8px;">
      For security, please change this password after your first login.
    </p>
  `
    : `
    <p style="margin: 10px 0;">
      You already have an account with us. You can continue using your existing password.
      If you don't remember it, you can use the "Forgot password" option on the login page.
    </p>
  `;

  const introText = params.isNewUser
    ? `You have been invited to join the following application(s) using this email address: <strong>${params.email}</strong>.`
    : `Your existing account <strong>${params.email}</strong> has been granted access to additional application(s).`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Ruigi Auth</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #002455; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px;">
    <h1 style="color: #050E3C; margin-top: 0;">Welcome to Ruigi Auth</h1>
    <p>${introText}</p>

    <h2 style="color: #050E3C;">Your Applications</h2>
    <ul style="padding-left: 20px; color: #002455;">
      ${appListHtml}
    </ul>

    ${passwordSection}

    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #002455; font-size: 13px;">
      If you did not expect this invitation or have any concerns, please contact your administrator.
    </p>
  </div>
  ${generateGlobalEmailFooter()}
</body>
</html>
  `.trim();
}

/**
 * Send password reset email (OTP-based)
 */
export async function sendPasswordResetEmail(
  email: string,
  otpCode: string,
  expiresInMinutes: number = 60
): Promise<void> {
  const subject = "Password Reset Request";
  const htmlContent = generatePasswordResetOTPEmail(otpCode, expiresInMinutes);

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
  const subject = "Your Login Code";
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
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #002455; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h1 style="color: #050E3C;">🔐 Confidential App Credentials</h1>
    <p>Your application <strong>${appName}</strong> has been updated to <strong>CONFIDENTIAL</strong> type.</p>
    <p>A new client secret has been generated. Please store this securely as it will not be shown again.</p>
    
    <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #DC0000;">
      <h3 style="color: #DC0000; margin-top: 0;">⚠️ Important Security Information</h3>
      <p style="margin: 10px 0;"><strong>Application Name:</strong> ${appName}</p>
      <p style="margin: 10px 0;"><strong>Client ID:</strong></p>
      <code style="background-color: #ecf0f1; padding: 8px 12px; border-radius: 3px; display: block; margin: 5px 0; word-break: break-all; font-family: 'Courier New', monospace;">${clientId}</code>
      
      <p style="margin: 10px 0;"><strong>Client Secret:</strong></p>
      <code style="background-color: #FF3838; padding: 8px 12px; border-radius: 3px; display: block; margin: 5px 0; word-break: break-all; font-family: 'Courier New', monospace; color: #ffffff;">${clientSecret}</code>
    </div>

    <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #050E3C;">
      <h4 style="color: #050E3C; margin-top: 0;">🔒 Security Best Practices</h4>
      <ul style="color: #002455; margin: 0; padding-left: 20px;">
        <li>Store this secret in a secure location (e.g., password manager, secrets vault)</li>
        <li>Never commit this secret to version control</li>
        <li>Use environment variables to store it in your application</li>
        <li>This secret will be required for all API requests from your app</li>
        <li>If compromised, contact support immediately to rotate the secret</li>
      </ul>
    </div>

    <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #002455;">
      <h4 style="color: #002455; margin-top: 0;">📝 Usage Example</h4>
      <p style="color: #002455; margin: 5px 0;">Include both credentials in your authentication requests:</p>
      <pre style="background-color: #fff; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px;"><code>{
  "client_id": "${clientId}",
  "client_secret": "${clientSecret}",
  ...
}</code></pre>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #002455; font-size: 12px;">
      This is an automated message. If you did not request this change or have any concerns, please contact support immediately.
    </p>
  </div>
  ${generateGlobalEmailFooter()}
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
  const htmlContent = generateClientSecretEmail(
    appName,
    clientId,
    clientSecret
  );

  await sendEmail(email, subject, htmlContent);
}

/**
 * Send user invite / welcome email
 */
export async function sendUserInviteEmail(params: {
  email: string;
  apps: { id: string; name: string }[];
  generatedPassword: string | null;
  isNewUser: boolean;
}): Promise<void> {
  const subject = params.isNewUser
    ? "Welcome to Ruigi Auth - Your Account Details"
    : "You have been granted access to new applications";
  const htmlContent = generateUserInviteEmail(params);

  await sendEmail(params.email, subject, htmlContent);
}

