FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.11.0

# Copy monorepo config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy client app + shared packages
COPY apps/client ./apps/client
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build client (Next.js server-mode build, outputs to .next/)
RUN pnpm --filter @sis/client build

EXPOSE 3000

# Run Next.js server
CMD ["pnpm", "--filter", "@sis/client", "start"]
