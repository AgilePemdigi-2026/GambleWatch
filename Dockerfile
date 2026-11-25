# Website GambleWatch (Next.js) untuk Coolify.
# Butuh Node >= 22.12: Tailwind (@tailwindcss/turbopack -> magic-string 1.x) memakai require() ESM.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Browser untuk Cypress/Playwright hanya dipakai untuk testing, tidak perlu di server
ENV CYPRESS_INSTALL_BINARY=0 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Nilai NEXT_PUBLIC_ dimasukkan ke kode browser saat build (diisi dari Environment Variables Coolify)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
# Alamat Kong di jaringan Docker; dipakai next.config.ts untuk meneruskan /supabase/... (opsional)
ARG SUPABASE_INTERNAL_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    SUPABASE_INTERNAL_URL=$SUPABASE_INTERNAL_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
