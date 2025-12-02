/**
 * Dev Script: Reset Default App Credentials
 *
 * Resets the client_id and client_secret for the default "Ruigi Dashboard" app.
 * Useful for development when you need consistent, known credentials.
 *
 * Usage:
 *   npm run dev:reset-app
 */

import { PrismaClient, AppType } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "../src/services/password.service";

const prisma = new PrismaClient();

const DEFAULT_APP_NAME = "Rugi Dashboard";
const DEFAULT_CLIENT_ID = "rugi-dashboard-dev";

async function main() {
  console.log("🔄 Resetting default app credentials...\n");

  // Find the default app
  let app = await prisma.app.findFirst({
    where: { name: DEFAULT_APP_NAME },
  });

  if (!app) {
    console.log("⚠️  Default app not found. Creating new app...\n");

    // Create the default app
    const clientSecret = uuidv4() + uuidv4(); // 64-character secret
    const clientSecretHash = await hashPassword(clientSecret);

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
      },
    });

    console.log("✅ Created default app");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📱 App Name:      ${app.name}`);
    console.log(`🆔 Client ID:     ${app.clientId}`);
    console.log(`🔑 Client Secret: ${clientSecret}`);
    console.log(`📋 Type:          ${app.type}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(
      "💾 Save these credentials - the secret will not be shown again!\n"
    );
    return;
  }

  // App exists, reset credentials
  console.log(`📱 Found app: ${app.name} (${app.id})\n`);

  // Generate new credentials
  const newClientId = DEFAULT_CLIENT_ID;
  const newClientSecret = uuidv4() + uuidv4(); // 64-character secret
  const newClientSecretHash = await hashPassword(newClientSecret);

  // Update the app
  await prisma.app.update({
    where: { id: app.id },
    data: {
      clientId: newClientId,
      clientSecretHash: newClientSecretHash,
    },
  });

  console.log("✅ Credentials reset successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📱 App Name:      ${app.name}`);
  console.log(`🆔 Client ID:     ${newClientId}`);
  console.log(`🔑 Client Secret: ${newClientSecret}`);
  console.log(`📋 Type:          ${app.type}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("💡 Use these credentials in your development environment:");
  console.log("");
  console.log("   .env file:");
  console.log(`   APP_CLIENT_ID=${newClientId}`);
  console.log(`   APP_CLIENT_SECRET=${newClientSecret}`);
  console.log("");
  console.log("   API requests:");
  console.log("   POST /login");
  console.log("   {");
  console.log('     "email": "user@example.com",');
  console.log('     "password": "password123",');
  console.log(`     "client_id": "${newClientId}",`);
  console.log(`     "client_secret": "${newClientSecret}"`);
  console.log("   }");
  console.log("");

  // Show redirect URIs
  const redirectUris = app.redirectUris as string[];
  if (redirectUris.length > 0) {
    console.log("🔗 Redirect URIs:");
    redirectUris.forEach((uri) => console.log(`   - ${uri}`));
    console.log("");
  }

  console.log("⚠️  Remember: This is for DEVELOPMENT only!");
  console.log("   Never use these credentials in production.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
