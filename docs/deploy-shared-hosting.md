# Deploying to shared hosting (cPanel / hPanel)

Plan: the web app is static files in `public_html`; the API is a Node.js app the host runs at `bunus.app/api`.
Needs a plan with a **Node.js** app feature and a MySQL database. Not tried on a real host yet.

## 1. Get the build

Every push to `main` runs **Actions > Build for deploy** and produces three downloads:

- `bunus-web`: upload its contents to `public_html` (it includes `.htaccess`).
- `bunus-api`: upload its contents to a folder outside `public_html`, for example `bunus-api`.
- `package-lock`: commit it to the repo as `package-lock.json` (once).

## 2. Create the Node.js app

Application root `bunus-api`, application URL `bunus.app/api`, startup file `app.js`, Node 22 (20 works).
Set these environment variables in the panel; never upload a `.env` file:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_ORIGIN` | `https://bunus.app` |
| `TRUST_PROXY` | `1` |
| `DATABASE_URL` | `mysql://USER:URL_ENCODED_PASSWORD@localhost:3306/DBNAME` (encode `^` as `%5E`, `$` as `%24`) |
| `OTP_PROVIDER` | `otpid` |
| `OTP_ID_API_KEY` | from the OTP.ID dashboard |

Add any other values from `.env.example` that you want to change (session lifetime, resend limits).

## 3. Install and create the tables

Press **Run NPM Install** (this also runs `prisma generate`). Then in the host's terminal, inside the app folder:

```bash
npm run db:push     # first deploy: creates the tables from prisma/schema.prisma
npm run db:seed     # permission catalogue and role templates
```

Restart the app and open `https://bunus.app/api/v1/health`.

`db:push` is for the first live test. Once migration files exist (`npm run prisma:migrate:dev -- --name init` on a
computer with Docker, committed under `prisma/migrations`), use `npm run db:migrate` instead.

## Known risks

- `@node-rs/argon2` and Prisma download native binaries during install. If install fails, send me the error.
- MariaDB is not MySQL 8. Prisma usually copes; the spec asks for MySQL 8.
- Shared hosting can stop idle Node apps, so the first request after a pause can be slow.
