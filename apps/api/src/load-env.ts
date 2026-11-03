import { join } from 'node:path';

// Local development: read the repo-root .env. On a server the host sets real environment
// variables, there is no .env file, and this does nothing. Existing variables are never overridden.
try {
  process.loadEnvFile(join(__dirname, '..', '..', '..', '.env'));
} catch {
  // No .env file: fine.
}
