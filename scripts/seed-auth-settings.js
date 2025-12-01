"use strict";
/**
 * Seed Script: Initialize default authentication settings for all apps
 *
 * This script creates default authentication settings for any app that doesn't have them yet.
 *
 * Usage:
 *   npx ts-node scripts/seed-auth-settings.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🔍 Finding apps without authentication settings...');
    // Get all apps
    const apps = await prisma.app.findMany({
        include: {
            authSettings: true,
        },
    });
    console.log(`📦 Found ${apps.length} total apps`);
    const appsWithoutSettings = apps.filter((app) => !app.authSettings);
    if (appsWithoutSettings.length === 0) {
        console.log('✅ All apps already have authentication settings');
        return;
    }
    console.log(`📝 Creating settings for ${appsWithoutSettings.length} apps...`);
    for (const app of appsWithoutSettings) {
        console.log(`  → Creating settings for app: ${app.name} (${app.id})`);
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
    console.log('✅ Successfully created authentication settings for all apps');
    // Display summary
    console.log('\n📊 Summary:');
    console.log(`   Total apps: ${apps.length}`);
    console.log(`   Apps with settings: ${apps.length - appsWithoutSettings.length}`);
    console.log(`   New settings created: ${appsWithoutSettings.length}`);
}
main()
    .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-auth-settings.js.map