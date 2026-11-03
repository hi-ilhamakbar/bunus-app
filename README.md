# Bunus

Bunus.app is a multi-tenant digital loyalty platform: stamp cards first, points next.
Node.js + TypeScript + NestJS API, Vue 3 PWA, MySQL 8, Prisma. No PHP.

This repository currently holds **step 1**: the foundation and customer sign-up with a one-time code
(email, WhatsApp or SMS through OTP.ID). Stamp issuing, merchants, staff and admin come next.

> **Status:** written without being able to run `npm install` (the build sandbox had no registry access).
> Nothing here has been compiled or tested yet. First run through the steps below and expect to fix small things.

## Run it locally

Needs Node 22+ and Docker.

```bash
npm install                      # also creates package-lock.json: commit it
cp .env.example .env             # then fill in the values; never commit .env
npm run db:up                    # MySQL 8.4 in Docker
npm run prisma:generate
npm run prisma:migrate:dev -- --name init   # creates prisma/migrations: commit them
npm run prisma:seed              # permission catalogue and role templates
npm run dev:api                  # http://localhost:3000/api/v1/health
npm run dev:web                  # http://localhost:5173
```

With `OTP_PROVIDER=fake` (the default in `.env.example`) no message is sent and the code is always `123456`.
The fake provider refuses to start in production. For real codes set `OTP_PROVIDER=otpid` and
`OTP_ID_API_KEY` in `.env`. The key stays on the server and is never sent to the browser.

Other commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
API docs (Swagger) are served at `/api/docs` outside production.

## Layout

```
apps/api      NestJS modular monolith (auth, customers, audit, health)
apps/web      Vue 3 + Vite PWA
prisma        schema, seed, and (once generated) migrations
docs          brief, technical spec, brand system, design direction
infrastructure/docker
```

## Read next

- `docs/architecture/design-direction.md`: design decisions and the contrast changes made to the brand palette.
- `docs/architecture/assumptions.md`: assumptions and open questions to confirm.
