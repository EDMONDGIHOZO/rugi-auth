/**
 * Script to add a new client application
 * Usage: tsx scripts/add-client.ts <name> <type> <redirect_uri1> [redirect_uri2...]
 * 
 * Example:
 * tsx scripts/add-client.ts "My App" CONFIDENTIAL "https://myapp.com/callback"
 */

import 'dotenv/config';
import { createApp } from '../src/services/app.service';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: tsx scripts/add-client.ts <name> <type> <redirect_uri1> [redirect_uri2...]');
    console.error('Example: tsx scripts/add-client.ts "My App" CONFIDENTIAL "https://myapp.com/callback"');
    process.exit(1);
  }

  const [name, type, ...redirectUris] = args;

  if (type !== 'PUBLIC' && type !== 'CONFIDENTIAL') {
    console.error('Type must be either "PUBLIC" or "CONFIDENTIAL"');
    process.exit(1);
  }

  try {
    const app = await createApp({
      name,
      type: type as 'PUBLIC' | 'CONFIDENTIAL',
      redirect_uris: redirectUris,
    });

    console.log('\n✓ Client application created successfully!\n');
    console.log('Application Details:');
    console.log(`  Name: ${app.name}`);
    console.log(`  Type: ${app.type}`);
    console.log(`  Client ID: ${app.client_id}`);
    
    if (app.type === 'CONFIDENTIAL') {
      console.log(`  Client Secret: ${app.client_secret}`);
      console.log('\n⚠️  IMPORTANT: Save the client_secret - it won\'t be shown again!');
    }
    
    console.log(`  Redirect URIs: ${app.redirect_uris.join(', ')}`);
    console.log(`  Created: ${app.created_at}\n`);
  } catch (error) {
    console.error('Error creating client application:', error);
    process.exit(1);
  }
}

main();




