FROM node:20-bookworm AS builder

RUN npm install -g pnpm@9

WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY services ./services

RUN pnpm install --frozen-lockfile

RUN pnpm -C packages/shared-config build || true
RUN pnpm -C packages/shared-dtos build || true
RUN pnpm -C packages/shared-errors build || true

RUN pnpm -C services/enrollment build

FROM node:20-alpine

RUN npm install -g pnpm@9
WORKDIR /app

COPY --from=builder /workspace/services/enrollment/dist ./dist
COPY --from=builder /workspace/services/enrollment/package.json ./
COPY --from=builder /workspace/pnpm-workspace.yaml ./
COPY --from=builder /workspace/pnpm-lock.yaml ./
COPY --from=builder /workspace/packages ./packages

RUN pnpm install --prod --no-frozen-lockfile

EXPOSE 3005

CMD ["node", "dist/main.js"]
