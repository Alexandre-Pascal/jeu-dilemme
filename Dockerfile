# Image de prod : API + Socket.io + Prisma (Neon en prod via DATABASE_URL)
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server apps/server

RUN pnpm --filter @dilemme/shared build
RUN cd apps/server && pnpm exec prisma generate && pnpm exec tsc -p tsconfig.build.json

EXPOSE 3001
ENV NODE_ENV=production
WORKDIR /app
CMD ["sh", "-c", "pnpm --filter @dilemme/server exec prisma migrate deploy && node apps/server/dist/index.js"]
