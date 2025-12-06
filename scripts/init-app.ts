/**
 * Script: Initialize App
 *
 * Creates or resets the default "Rugi Dashboard" app with credentials.
 * Also ensures authentication settings are configured for the app.
 *
 * Usage:
 *   npm run init:app
 */

import { PrismaClient, AppType } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "../src/services/password.service";

const prisma = new PrismaClient();

const DEFAULT_APP_NAME = "Rugi Dashboard";
const DEFAULT_CLIENT_ID = "rugi-dashboard-dev";

async function main() {
  console.log("🚀 Initializing app...\n");

  // Find the default app
  let app = await prisma.app.findFirst({
    where: { name: DEFAULT_APP_NAME },
    include: { authSettings: true },
  });

  const clientSecret = uuidv4() + uuidv4(); // 64-character secret
  const clientSecretHash = await hashPassword(clientSecret);

  if (!app) {
    console.log("📦 Creating new app...\n");

    // Create the default app
    app = await prisma.app.create({
      data: {
        name: DEFAULT_APP_NAME,
        clientId: DEFAULT_CLIENT_ID,
        clientSecretHash,
        type: AppType.CONFIDENTIAL,
        redirectUris: [
          "http://localhost:3000/callback",
          "http://localhost:3001/callback",
          "http://localhost:5173/callback",
        ],
        authSettings: {
          create: {
            emailPasswordEnabled: true,
            emailOtpEnabled: false,
            googleAuthEnabled: false,
            githubAuthEnabled: false,
            microsoftAuthEnabled: false,
            facebookAuthEnabled: false,
            requireEmailVerification: true,
            allowRegistration: true,
          },
        },
      },
      include: { authSettings: true },
    });

    console.log("✅ App created successfully!");
  } else {
    console.log(`📱 Found existing app: ${app.name} (${app.id})`);
    console.log("🔄 Resetting credentials...\n");

    // Update the app credentials
    app = await prisma.app.update({
      where: { id: app.id },
      data: {
        clientId: DEFAULT_CLIENT_ID,
        clientSecretHash,
      },
      include: { authSettings: true },
    });

    // Ensure auth settings exist
    if (!app.authSettings) {
      console.log("📝 Creating authentication settings...");
      await prisma.appAuthSettings.create({
        data: {
          appId: app.id,
          emailPasswordEnabled: true,
          emailOtpEnabled: false,
          googleAuthEnabled: false,
          githubAuthEnabled: false,
          microsoftAuthEnabled: false,
          facebookAuthEnabled: false,
          requireEmailVerification: true,
          allowRegistration: true,
        },
      });
    }

    console.log("✅ App credentials reset successfully!");
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📱 App Name:      ${app.name}`);
  console.log(`🆔 Client ID:     ${DEFAULT_CLIENT_ID}`);
  console.log(`🔑 Client Secret: ${clientSecret}`);
  console.log(`📋 Type:          ${app.type}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("💡 Use these credentials in your development environment:");
  console.log("");
  console.log("   .env file:");
  console.log(`   APP_CLIENT_ID=${DEFAULT_CLIENT_ID}`);
  console.log(`   APP_CLIENT_SECRET=${clientSecret}`);
  console.log("");
  console.log("   API requests:");
  console.log("   POST /login");
  console.log("   {");
  console.log('     "email": "user@example.com",');
  console.log('     "password": "password123",');
  console.log(`     "client_id": "${DEFAULT_CLIENT_ID}",`);
  console.log(`     "client_secret": "${clientSecret}"`);
  console.log("   }");
  console.log("");

  // Show redirect URIs
  const redirectUris = app.redirectUris as string[];
  if (redirectUris.length > 0) {
    console.log("🔗 Redirect URIs:");
    redirectUris.forEach((uri) => console.log(`   - ${uri}`));
    console.log("");
  }

  console.log("💾 Save these credentials - the secret will not be shown again!\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

