# SoloFlow container image (used by the Unraid template in unraid/). Build: docker build -t soloflow .
# It needs a PostgreSQL 14+ database (DATABASE_URL) and SOLOFLOW_SECRET. Migrations run on every start.
ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN mkdir -p public
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY tools/copy-pdf-assets.js ./tools/copy-pdf-assets.js
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 SOLOFLOW_STANDALONE=1
RUN npx prisma generate && npm run build
# the Prisma CLI with its own dependencies, for running migrations when the container starts
RUN mkdir /prisma-cli && cd /prisma-cli && npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund prisma@$(node -p "require('/app/node_modules/prisma/package.json').version")

FROM ${NODE_IMAGE} AS run
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl tini && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 SOLOFLOW_BACKUP_DIR=/backups
# the standalone server, its static files and public assets (pdf.js worker and fonts included)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# statement reading loads pdf.js and its fonts by path; the database client and its engine
COPY --from=build /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /prisma-cli ./prisma-cli
COPY --from=build /app/prisma ./prisma
COPY tools/docker-start.sh ./start.sh
RUN mkdir -p /backups && chown -R node:node /backups /app && chmod +x ./start.sh
USER node
VOLUME ["/backups"]
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./start.sh"]
