"use strict";
/**
 * Dev Script: Create First Superadmin User
 *
 * Creates the first superadmin user and assigns them as owner of the default app.
 * This command should be run once after creating the default app.
 *
 * Usage:
 *   Interactive mode:
 *     npm run dev:create-superadmin
 *
 *   Non-interactive mode:
 *     SUPERADMIN_EMAIL=admin@example.com SUPERADMIN_PASSWORD=password123 npm run dev:create-superadmin
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
const readline = __importStar(require("readline"));
const password_service_1 = require("../src/services/password.service");
const prisma = new client_1.PrismaClient();
const DEFAULT_APP_NAME = 'YebaLabs Dashboard';
// Check if running in interactive mode
const isInteractive = process.stdin.isTTY && process.stdout.isTTY;
// Create readline interface for prompting (only in interactive mode)
let rl = null;
if (isInteractive) {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}
function question(prompt) {
    if (!isInteractive || !rl) {
        return Promise.resolve('');
    }
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}
function questionHidden(prompt) {
    return new Promise((resolve) => {
        const stdin = process.stdin;
        const stdout = process.stdout;
        // @ts-ignore
        stdin.resume();
        stdout.write(prompt);
        // @ts-ignore
        stdin.setRawMode(true);
        // @ts-ignore
        stdin.resume();
        // @ts-ignore
        stdin.setEncoding('utf8');
        let password = '';
        const onData = (char) => {
            char = char.toString('utf8');
            switch (char) {
                case '\n':
                case '\r':
                case '\u0004':
                    // @ts-ignore
                    stdin.setRawMode(false);
                    stdin.pause();
                    stdout.write('\n');
                    stdin.removeListener('data', onData);
                    resolve(password);
                    break;
                case '\u0003':
                    // Ctrl+C
                    process.exit();
                    break;
                case '\u007f': // Backspace
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        stdout.clearLine(0);
                        stdout.cursorTo(0);
                        stdout.write(prompt + '*'.repeat(password.length));
                    }
                    break;
                default:
                    password += char;
                    stdout.write('*');
                    break;
            }
        };
        stdin.on('data', onData);
    });
}
async function main() {
    console.log('🔐 Create First Superadmin User');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    // Step 1: Find the default app
    const defaultApp = await prisma.app.findFirst({
        where: { name: DEFAULT_APP_NAME },
    });
    if (!defaultApp) {
        console.error('❌ Error: Default app not found!');
        console.error('   Please run: npm run dev:reset-app first\n');
        process.exit(1);
    }
    console.log(`✅ Found default app: ${defaultApp.name}`);
    console.log(`   App ID: ${defaultApp.id}\n`);
    // Step 2: Check if superadmin already exists
    const existingSuperadmin = await prisma.userAppRole.findFirst({
        where: {
            role: {
                appId: defaultApp.id,
                name: 'superadmin',
            },
        },
        include: {
            user: true,
            role: true,
        },
    });
    if (existingSuperadmin) {
        console.log('⚠️  Superadmin already exists!');
        console.log(`   Email: ${existingSuperadmin.user.email}`);
        console.log(`   Role: ${existingSuperadmin.role.name}\n`);
        if (isInteractive) {
            const confirm = await question('Do you want to create another superadmin? (yes/no): ');
            if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
                console.log('\n✋ Cancelled.\n');
                rl?.close();
                return;
            }
            console.log('');
        }
        else if (!process.env.FORCE_CREATE) {
            console.log('💡 Use FORCE_CREATE=true to create another superadmin\n');
            return;
        }
    }
    // Step 3: Get email and password (from env or prompt)
    let email;
    let password;
    if (!isInteractive) {
        // Non-interactive mode: use environment variables
        email = process.env.SUPERADMIN_EMAIL || '';
        password = process.env.SUPERADMIN_PASSWORD || '';
        if (!email || !password) {
            console.error('❌ Error: In non-interactive mode, provide:');
            console.error('   SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD environment variables\n');
            console.error('   Example:');
            console.error('   SUPERADMIN_EMAIL=admin@example.com SUPERADMIN_PASSWORD=password123 npm run dev:create-superadmin\n');
            process.exit(1);
        }
    }
    else {
        // Interactive mode: prompt
        email = await question('Enter superadmin email: ');
        if (!email || !email.includes('@')) {
            console.error('\n❌ Invalid email address\n');
            rl?.close();
            process.exit(1);
        }
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            console.error('\n❌ User with this email already exists!\n');
            rl?.close();
            process.exit(1);
        }
        password = await questionHidden('Enter password (min 8 characters): ');
        if (password.length < 8) {
            console.error('\n❌ Password must be at least 8 characters\n');
            rl?.close();
            process.exit(1);
        }
        const confirmPassword = await questionHidden('Confirm password: ');
        if (password !== confirmPassword) {
            console.error('\n❌ Passwords do not match\n');
            rl?.close();
            process.exit(1);
        }
        rl?.close();
    }
    // Validate credentials
    if (!email || !email.includes('@')) {
        console.error('\n❌ Invalid email address\n');
        process.exit(1);
    }
    if (password.length < 8) {
        console.error('\n❌ Password must be at least 8 characters\n');
        process.exit(1);
    }
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        console.error('\n❌ User with this email already exists!\n');
        process.exit(1);
    }
    console.log('\n📝 Creating superadmin user...\n');
    // Step 4: Hash password
    const passwordHash = await (0, password_service_1.hashPassword)(password);
    // Step 5: Create user
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            isEmailVerified: true, // Superadmin is auto-verified
            optedInApps: [defaultApp.id],
            registrationMethod: 'EMAIL_PASSWORD',
        },
    });
    console.log(`✅ User created: ${user.email}`);
    // Step 6: Find or create superadmin role
    let superadminRole = await prisma.role.findUnique({
        where: {
            appId_name: {
                appId: defaultApp.id,
                name: 'superadmin',
            },
        },
    });
    if (!superadminRole) {
        superadminRole = await prisma.role.create({
            data: {
                appId: defaultApp.id,
                name: 'superadmin',
            },
        });
        console.log('✅ Created "superadmin" role');
    }
    else {
        console.log('✅ "superadmin" role already exists');
    }
    // Step 7: Assign superadmin role to user
    await prisma.userAppRole.create({
        data: {
            userId: user.id,
            roleId: superadminRole.id,
        },
    });
    console.log('✅ Assigned "superadmin" role to user');
    // Step 8: Also create owner role and assign it
    let ownerRole = await prisma.role.findUnique({
        where: {
            appId_name: {
                appId: defaultApp.id,
                name: 'owner',
            },
        },
    });
    if (!ownerRole) {
        ownerRole = await prisma.role.create({
            data: {
                appId: defaultApp.id,
                name: 'owner',
            },
        });
        console.log('✅ Created "owner" role');
    }
    await prisma.userAppRole.create({
        data: {
            userId: user.id,
            roleId: ownerRole.id,
        },
    });
    console.log('✅ Assigned "owner" role to user');
    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Superadmin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email:    ${user.email}`);
    console.log(`🆔 User ID:  ${user.id}`);
    console.log(`📱 App:      ${defaultApp.name}`);
    console.log(`👑 Roles:    superadmin, owner`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 You can now login with these credentials:');
    console.log('');
    console.log('   POST http://localhost:3000/login');
    console.log('   {');
    console.log(`     "email": "${user.email}",`);
    console.log('     "password": "your-password",');
    console.log(`     "client_id": "${defaultApp.clientId}"`);
    console.log('   }');
    console.log('');
    console.log('⚠️  Remember: This user has full access to the system!\n');
}
main()
    .catch((e) => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=create-superadmin.js.map