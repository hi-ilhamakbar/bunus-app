# Assumptions and open questions

Confirm or correct these; each is cheap to change now.

## Unverified

- Nothing has been installed, compiled or run. Package versions are best guesses; `package-lock.json` does not exist yet.
- OTP.ID now goes through the official `@otp-id/sdk`, written from its README. The version is `*` because it could not be looked up; after `npm install`, pin the installed version in `apps/api/package.json`.
- Prisma migrations are not generated. Run `npm run prisma:migrate:dev -- --name init` and commit the result.

## Product assumptions

- Points is a data-model foundation only in this step. Stamp comes first.
- Phone number is required only when WhatsApp or SMS is the chosen channel.
- Trial 14 days, grace 7 days (subscriptions come in step 3).
- Customer sessions are cookies (HttpOnly, SameSite=Lax, 30 days) with an Origin check on unsafe methods.
- The web interface is English and Bahasa Indonesia (`apps/web/src/i18n/`). It starts in the browser's language and remembers the choice. Server error text is translated in the browser by error code; field-level validation text from the API is still English.
- The logo is a hand-built SVG bunny placeholder. Swap in the real vector mark when you have one.

## Deferred on purpose

Merchant, staff and admin login; RBAC guards and tenant-isolation tests (schema exists); Stamp ledger and QR flows;
subscriptions and referral; Lottie animations; Points rules.

## Not done

- Optional `otp.verified` webhook (`parseVerifiedEvent` in the SDK). Sign-up verifies synchronously, so it is not needed yet. It would be needed for the WhatsApp-inbound channel.
