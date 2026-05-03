# Build context is the REPO ROOT. Build with:
#   docker build -t tradeoff-server .
# This file is a duplicate of server/Dockerfile — kept at the repo root
# so deploy tooling (Cloud Run source deploy, Cloud Build with no -f
# flag, GitHub auto-deploy actions) finds it without configuration.
# Both files use the same repo-root context and the same COPY paths.

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
