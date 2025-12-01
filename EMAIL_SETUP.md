# Email Service Setup Guide

This guide explains how to set up the email service using Microsoft Azure Communication Services for password reset and OTP login functionality.

## Prerequisites

1. An Azure account with an active subscription
2. Azure Communication Services resource created in Azure Portal

## Azure Communication Services Setup

### 1. Create Azure Communication Services Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Communication Services" and select it
4. Click "Create"
5. Fill in the required details:
   - **Resource Group**: Create new or select existing
   - **Name**: Choose a unique name (e.g., `yebalabs-auth-email`)
   - **Region**: Select your preferred region
6. Click "Review + create" then "Create"

### 2. Get Connection String

1. Navigate to your Communication Services resource
2. Go to "Keys" in the left sidebar
3. Copy the **Connection string** (starts with `endpoint=https://...`)

### 3. Set Up Email Domain (Required for Production)

Azure Communication Services Email requires a verified domain. You have two options:

#### Option A: Use Azure Managed Domain (Quick Start)

1. In your Communication Services resource, go to "Email" → "Domains"
2. Click "Add domain"
3. Select "Azure Managed Domain"
4. Choose a subdomain (e.g., `yebalabs-auth`)
5. Complete the domain verification process

#### Option B: Use Your Own Domain (Recommended for Production)

1. In your Communication Services resource, go to "Email" → "Domains"
2. Click "Add domain"
3. Select "Custom Domain"
4. Enter your domain (e.g., `mail.yourdomain.com`)
5. Add the required DNS records to verify domain ownership
6. Wait for verification to complete

### 4. Create Email Communication Service

1. In your Communication Services resource, go to "Email" → "Email Communication Services"
2. Click "Create"
3. Fill in the details:
   - **Name**: Choose a name
   - **Domain**: Select your verified domain
4. Click "Create"

## Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Azure Communication Services Email
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://your-resource.communication.azure.com/;accesskey=your-access-key
AZURE_COMMUNICATION_SENDER_EMAIL=noreply@yourdomain.com

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000

# Optional: Customize token/OTP expiry
PASSWORD_RESET_TOKEN_EXPIRY=1h  # Default: 1 hour
OTP_EXPIRY=10m                   # Default: 10 minutes
OTP_LENGTH=6                     # Default: 6 digits
```

### Environment Variables Explained

- **AZURE_COMMUNICATION_CONNECTION_STRING**: Connection string from Azure Portal (Keys section)
- **AZURE_COMMUNICATION_SENDER_EMAIL**: Email address from your verified domain (e.g., `noreply@yourdomain.com`)
- **FRONTEND_URL**: Base URL of your frontend application (used in password reset links)
- **PASSWORD_RESET_TOKEN_EXPIRY**: Time string format (e.g., `1h`, `30m`, `2d`)
- **OTP_EXPIRY**: Time string format for OTP expiration
- **OTP_LENGTH**: Number of digits in OTP code (4-8 digits)

## Database Migration

After setting up the environment variables, run the database migration:

```bash
npm run prisma:migrate
```

This will create the `password_reset_tokens` and `email_otps` tables.

## API Endpoints

### Password Reset

#### Request Password Reset
```http
POST /password-reset/request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### Verify Reset Token
```http
POST /password-reset/verify
Content-Type: application/json

{
  "token": "uuid-token"
}
```

**Response:**
```json
{
  "valid": true,
  "message": "Reset token is valid"
}
```

#### Reset Password
```http
POST /password-reset/reset
Content-Type: application/json

{
  "token": "uuid-token",
  "new_password": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully"
}
```

### OTP Login

#### Request OTP
```http
POST /otp/request
Content-Type: application/json

{
  "email": "user@example.com",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret" // Optional for PUBLIC apps
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, an OTP code has been sent."
}
```

#### Verify OTP and Login
```http
POST /otp/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret", // Optional for PUBLIC apps
  "device_info": { // Optional
    "device": "iPhone",
    "browser": "Safari"
  }
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "refresh_token": "uuid-token",
  "token_type": "Bearer",
  "expires_in": 604800
}
```

## Email Templates

The service includes HTML email templates for:

1. **Password Reset**: Professional email with reset button and link
2. **OTP Login**: Clean email displaying the OTP code in a highlighted box

Templates are responsive and include:
- Clear call-to-action buttons
- Expiry information
- Security warnings
- Fallback text links

## Security Features

1. **Token Expiration**: All tokens and OTPs expire after a configurable time
2. **One-Time Use**: Tokens and OTPs are marked as used after successful verification
3. **Automatic Invalidation**: Old unused tokens/OTPs are invalidated when new ones are requested
4. **Email Enumeration Protection**: Responses don't reveal if an email exists in the system
5. **Rate Limiting**: All endpoints are protected by rate limiting middleware
6. **Password Reset Security**: After password reset, all refresh tokens are revoked

## Testing

### Local Development

For local development without Azure, you can:

1. Leave `AZURE_COMMUNICATION_CONNECTION_STRING` unset
2. The service will log a warning but continue to work
3. Email sending will fail gracefully with an error message

### Testing with Azure

1. Use Azure Communication Services test domain for development
2. Monitor email delivery in Azure Portal → Communication Services → Email → Delivery logs
3. Check application logs for email sending status

## Troubleshooting

### Email Not Sending

1. **Check Connection String**: Verify `AZURE_COMMUNICATION_CONNECTION_STRING` is correct
2. **Verify Domain**: Ensure domain is verified in Azure Portal
3. **Check Sender Email**: Must match your verified domain
4. **Review Logs**: Check application logs for detailed error messages
5. **Azure Quotas**: Check if you've exceeded Azure service quotas

### Common Errors

- **"Email service is not configured"**: Connection string or sender email missing
- **"Failed to send email"**: Check Azure service status and domain verification
- **"Invalid reset token"**: Token expired, already used, or doesn't exist
- **"OTP code has expired"**: Request a new OTP code

## Cost Considerations

Azure Communication Services Email pricing:
- Free tier: 50,000 emails/month
- Pay-as-you-go: $0.0001 per email after free tier

Monitor usage in Azure Portal → Communication Services → Metrics

## Additional Resources

- [Azure Communication Services Documentation](https://docs.microsoft.com/azure/communication-services/)
- [Email Service Quickstart](https://docs.microsoft.com/azure/communication-services/quickstarts/email/send-email)
- [Domain Verification Guide](https://docs.microsoft.com/azure/communication-services/concepts/email/email-domain-verification)

