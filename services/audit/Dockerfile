FROM node:20-bookworm AS builder
RUN npm install -g pnpm@9

WORKDIR /workspace

COPY pnpm-workspace.yaml package.json ./
COPY pnpm-lock.yaml ./
COPY packages ./packages
COPY services ./services

RUN pnpm install --frozen-lockfile

RUN pnpm -C packages/shared-config build || true
RUN pnpm -C packages/shared-dtos build || true
RUN pnpm -C packages/shared-errors build || true

RUN pnpm -C services/audit build

FROM node:20-alpine

RUN npm install -g pnpm@9
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /workspace/services/audit/dist ./dist
COPY --from=builder /workspace/services/audit/package.json ./
COPY --from=builder /workspace/pnpm-workspace.yaml ./
COPY --from=builder /workspace/pnpm-lock.yaml ./
COPY --from=builder /workspace/packages ./packages

RUN pnpm install --prod --no-frozen-lockfile

EXPOSE 3004

CMD ["node", "dist/main.js"]
