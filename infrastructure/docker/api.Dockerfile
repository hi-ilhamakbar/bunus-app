# Not built or run yet. Check it with `docker compose --profile app build api` once you have Docker.
FROM node:22-slim AS build
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY tsconfig.base.json ./
COPY prisma prisma
COPY apps/api apps/api
RUN npx prisma generate --schema prisma/schema.prisma && npm run build -w @bunus/api

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /repo /repo
USER node
EXPOSE 3000
# Apply committed migrations, then start. Secrets come from the environment, never from the image.
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && node apps/api/dist/main.js"]
