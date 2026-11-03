# Deploying to cPanel

Plan: the web app is static files in `public_html`; the API is a Node.js app that cPanel runs at `bunus.app/api`.
Not tried yet, so treat it as a first draft. It needs a host with **Setup Node.js App** and **MySQL** in cPanel.

## Needed from the host

- Node.js 20 or newer in "Setup Node.js App" (the code asks for 22; lower the `engines` field if the host tops out at 20).
- MySQL 8. MariaDB often works with Prisma but is not what the spec asks for.
- SSH or the cPanel Terminal, to run `prisma migrate deploy` once.

## Steps

1. **Database.** cPanel > MySQL Databases: create a database and a user, give the user all privileges.
   `DATABASE_URL` is `mysql://USER:PASSWORD@localhost:3306/DBNAME`. cPanel prefixes names with your account name.
2. **Migration files.** On your computer run `npm run prisma:migrate:dev -- --name init` and commit `prisma/migrations`.
3. **Build on your computer.** `npm install`, `npm run prisma:generate`, `npm run build`.
4. **Web.** Upload everything inside `apps/web/dist` to `public_html` (include `.htaccess`).
5. **API.** Create `bunus-api` outside `public_html`. Upload `apps/api/dist`, `apps/api/app.js`, `apps/api/package.json`,
   the root `package.json` and `package-lock.json`, and the `prisma` folder.
6. **Node.js App.** cPanel > Setup Node.js App > Create: version 22 (or 20), mode Production, application root
   `bunus-api`, application URL `bunus.app/api`, startup file `app.js`. Add the environment variables from `.env.example`:
   `NODE_ENV=production`, `APP_ORIGIN=https://bunus.app`, `TRUST_PROXY=1`, `DATABASE_URL`, `SESSION_*`,
   `OTP_PROVIDER=otpid`, `OTP_ID_API_KEY`. Enter them in cPanel only; never upload a `.env` file.
7. Press **Run NPM Install**, then in the Terminal (cPanel shows the "enter virtual environment" command):
   `npx prisma generate --schema prisma/schema.prisma && npx prisma migrate deploy --schema prisma/schema.prisma && npm run prisma:seed`
8. **Restart** the app and open `https://bunus.app/api/v1/health`.
9. Turn on **AutoSSL** (cPanel > SSL/TLS Status) and force HTTPS. The session cookie is `Secure` in production.

## Known risks

- `@node-rs/argon2` and Prisma ship native binaries. If install fails on the shared server, tell me the error.
- Shared hosting may kill idle Node apps; the first request after a pause can be slow.
