// Builds release/bunus-api: everything the server needs to run the API, without source or dev tools.
// Run after `npm run build -w @bunus/api`. The server then runs `npm install` itself, so native
// packages (argon2, Prisma engine) are fetched for the server's own platform.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const api = read('apps/api/package.json');
const root = read('package.json');

const out = 'release/bunus-api';
rmSync('release', { recursive: true, force: true });
mkdirSync(out, { recursive: true });

cpSync('apps/api/dist', `${out}/dist`, { recursive: true });
cpSync('apps/api/app.js', `${out}/app.js`);
cpSync('prisma/schema.prisma', `${out}/prisma/schema.prisma`);
cpSync('prisma/seed', `${out}/prisma/seed`, { recursive: true });
try {
  cpSync('prisma/migrations', `${out}/prisma/migrations`, { recursive: true });
} catch {
  // No migration files yet: use db:push for the first deploy.
}

const pkg = {
  name: 'bunus-api',
  version: api.version,
  private: true,
  engines: { node: '>=20' },
  scripts: {
    start: 'node app.js',
    postinstall: 'prisma generate --schema prisma/schema.prisma',
    'db:push': 'prisma db push --schema prisma/schema.prisma',
    'db:migrate': 'prisma migrate deploy --schema prisma/schema.prisma',
    'db:seed': 'tsx prisma/seed/seed.ts',
  },
  dependencies: {
    ...api.dependencies,
    prisma: root.devDependencies.prisma,
    tsx: root.devDependencies.tsx,
  },
};
writeFileSync(`${out}/package.json`, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Wrote ${out}`);
