FROM node:22-alpine AS build

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

# Build client (outputs to out/)
RUN pnpm --filter @sis/client build

# Static stage: serve with lightweight nginx
FROM nginx:1.27-alpine

# Copy built static files from build stage
COPY --from=build /app/apps/client/out /usr/share/nginx/html/

# Minimal nginx config: serve static files, fallback to index.html for SPA routing
RUN echo 'server { listen 3000; root /usr/share/nginx/html; index index.html; location / { try_files $uri /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
