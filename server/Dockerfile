# Build context is the REPO ROOT, not server/. This is needed so the
# COPY for /content/ can reach files outside server/. Build with:
#   docker build -f server/Dockerfile -t tradeoff-server .
# (The -f flag picks up this Dockerfile while keeping the repo root as
#  the build context.)

FROM node:20-slim AS build
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=optional
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
# Manifestos and taxonomy. Read at runtime by
# server/src/sources/manifestoSource.ts via repoRoot() — when cwd is /app
# (Cloud Run default), repoRoot() returns /app, so files must live at
# /app/content/. The content/ directory is gitignored, so this COPY
# pulls from the working tree at build time, not the repo.
COPY content ./content
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
