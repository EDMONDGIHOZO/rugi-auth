"use strict";
/**
 * Migration Script: Restructure Roles to be App-Specific
 *
 * This script migrates the existing global roles to app-specific roles.
 * For each existing role, it creates a copy for each app that uses it.
 *
 * WARNING: This will restructure your data. Backup your database first!
 *
 * Usage:
 *   npm run migrate:roles
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🔄 Starting role restructure migration...\n');
    // Step 1: Get all existing data
    console.log('📊 Analyzing existing data...');
    const existingRoles = await prisma.role.findMany();
    const existingUserAppRoles = await prisma.userAppRole.findMany({
        include: {
            role: true,
            user: true,
        },
    });
    const apps = await prisma.app.findMany();
    console.log(`  Found ${existingRoles.length} existing roles`);
    console.log(`  Found ${existingUserAppRoles.length} user-app-role assignments`);
    console.log(`  Found ${apps.length} apps\n`);
    if (existingRoles.length === 0) {
        console.log('✅ No existing roles to migrate. Schema can be updated directly.\n');
        return;
    }
    // Step 2: Save the mapping for later recreation
    console.log('💾 Saving role assignments...');
    const assignments = [];
    for (const uar of existingUserAppRoles) {
        // Get the app this assignment was for
        const appId = uar.appId;
        assignments.push({
            userId: uar.userId,
            oldRoleId: uar.roleId,
            roleName: uar.role.name,
            appId: appId,
            assignedBy: uar.assignedBy,
            assignedAt: uar.assignedAt,
        });
    }
    console.log(`  Saved ${assignments.length} assignments\n`);
    // Step 3: Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.userAppRole.deleteMany();
    await prisma.role.deleteMany();
    console.log('  Data cleared\n');
    // Step 4: Now we can safely apply the schema changes
    console.log('⚠️  Schema has been updated in Prisma.');
    console.log('   Run: npx prisma migrate dev --name restructure_roles_app_specific');
    console.log('   Then run this script again with --recreate flag to restore data\n');
    // Save assignments to file for safety
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    fs.writeFileSync('./role-migration-backup.json', JSON.stringify({ assignments, apps, existingRoles }, null, 2));
    console.log('💾 Backup saved to: role-migration-backup.json\n');
}
async function recreateRolesAndAssignments() {
    console.log('🔄 Recreating roles and assignments from backup...\n');
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    if (!fs.existsSync('./role-migration-backup.json')) {
        console.error('❌ Backup file not found!');
        return;
    }
    const backup = JSON.parse(fs.readFileSync('./role-migration-backup.json', 'utf-8'));
    const { assignments } = backup;
    // Group assignments by app and role
    const rolesByApp = {};
    for (const assignment of assignments) {
        if (!rolesByApp[assignment.appId]) {
            rolesByApp[assignment.appId] = new Set();
        }
        rolesByApp[assignment.appId].add(assignment.roleName);
    }
    // Create roles for each app
    console.log('📝 Creating app-specific roles...');
    const roleMap = {}; // key: appId:roleName, value: roleId
    for (const [appId, roleNames] of Object.entries(rolesByApp)) {
        for (const roleName of roleNames) {
            const role = await prisma.role.create({
                data: {
                    appId,
                    name: roleName,
                },
            });
            roleMap[`${appId}:${roleName}`] = role.id;
            console.log(`  Created role "${roleName}" for app ${appId}`);
        }
    }
    // Recreate assignments
    console.log('\n👥 Recreating user role assignments...');
    for (const assignment of assignments) {
        const roleKey = `${assignment.appId}:${assignment.roleName}`;
        const newRoleId = roleMap[roleKey];
        if (!newRoleId) {
            console.error(`  ⚠️  Could not find role for ${roleKey}`);
            continue;
        }
        try {
            await prisma.userAppRole.create({
                data: {
                    userId: assignment.userId,
                    roleId: newRoleId,
                    assignedBy: assignment.assignedBy,
                    assignedAt: assignment.assignedAt,
                },
            });
            console.log(`  ✓ Assigned "${assignment.roleName}" to user ${assignment.userId}`);
        }
        catch (error) {
            console.error(`  ✗ Failed to assign role: ${error.message}`);
        }
    }
    console.log('\n✅ Migration complete!');
    console.log('   You can now delete role-migration-backup.json if everything looks good.\n');
}
// Check command line args
const args = process.argv.slice(2);
if (args.includes('--recreate')) {
    recreateRolesAndAssignments()
        .catch((e) => {
        console.error('❌ Error:', e.message);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
else {
    main()
        .catch((e) => {
        console.error('❌ Error:', e.message);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
//# sourceMappingURL=migrate-roles-to-app-specific.js.map