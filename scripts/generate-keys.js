"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKeys = generateKeys;
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Generate RSA 2048-bit key pair for JWT signing
 * Saves private key to keys/private.pem and public key to keys/public.pem
 */
function generateKeys() {
    const keysDir = path_1.default.join(process.cwd(), 'keys');
    // Create keys directory if it doesn't exist
    if (!fs_1.default.existsSync(keysDir)) {
        fs_1.default.mkdirSync(keysDir, { recursive: true });
    }
    const privateKeyPath = path_1.default.join(keysDir, 'private.pem');
    const publicKeyPath = path_1.default.join(keysDir, 'public.pem');
    // Check if keys already exist
    if (fs_1.default.existsSync(privateKeyPath) || fs_1.default.existsSync(publicKeyPath)) {
        console.warn('Warning: Keys already exist. Delete existing keys to regenerate.');
        console.log(`Private key: ${privateKeyPath}`);
        console.log(`Public key: ${publicKeyPath}`);
        return;
    }
    console.log('Generating RSA 2048-bit key pair...');
    // Generate key pair
    const { publicKey, privateKey } = (0, crypto_1.generateKeyPairSync)('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });
    // Write keys to files
    fs_1.default.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 }); // Read/write for owner only
    fs_1.default.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 }); // Read for all, write for owner
    console.log('✓ Keys generated successfully!');
    console.log(`Private key: ${privateKeyPath}`);
    console.log(`Public key: ${publicKeyPath}`);
    console.log('\n⚠️  IMPORTANT: Keep the private key secure and never commit it to version control!');
}
// Run if executed directly
if (require.main === module) {
    try {
        generateKeys();
        process.exit(0);
    }
    catch (error) {
        console.error('Error generating keys:', error);
        process.exit(1);
    }
}
//# sourceMappingURL=generate-keys.js.map