# Assumptions and open questions

Confirm or correct these; each is cheap to change now.

## Unverified

- Nothing has been installed, compiled or run. Package versions are best guesses; `package-lock.json` does not exist yet.
- OTP.ID request field names (`code`, `email`, `number`) are isolated in the `FIELDS` constant in
  `apps/api/src/auth/otp/otpid.provider.ts` because the docs were unreachable. Check them against https://docs.otp.id.
  The official Node SDK could replace the `fetch` adapter if you prefer it.
- Prisma migrations are not generated. Run `npm run prisma:migrate:dev -- --name init` and commit the result.

## Product assumptions

- Points is a data-model foundation only in this step. Stamp comes first.
- Phone number is required only when WhatsApp or SMS is the chosen channel.
- Trial 14 days, grace 7 days (subscriptions come in step 3).
- Customer sessions are cookies (HttpOnly, SameSite=Lax, 30 days) with an Origin check on unsafe methods.
- The interface is English only. Say if you want Bahasa Indonesia; all strings live in `apps/web/src/copy.ts`.
- The logo is a hand-built SVG bunny placeholder. Swap in the real vector mark when you have one.

## Deferred on purpose

Merchant, staff and admin login; RBAC guards and tenant-isolation tests (schema exists); Stamp ledger and QR flows;
subscriptions and referral; Lottie animations; Points rules.

## Not done

- Optional `otp.verified` webhook (the sign-up flow verifies synchronously, so it is not needed yet).
