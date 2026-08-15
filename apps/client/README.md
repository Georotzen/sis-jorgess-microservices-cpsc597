# Next.js Client Application

Phase 5: Static-output SPA served by Nginx.

## Build

```bash
pnpm build
```

This produces `out/` — pure static HTML/CSS/JS with no Node.js runtime.

## Integration with Nginx + Gateway

- **Relative paths**: All API calls use `fetch('/identity/login')`, not `http://localhost:3000/api/...`. This ensures the browser always calls the same origin (Nginx), which proxies to the Gateway.
- **CORS**: Handled by the Gateway (services/gateway/src/main.ts), not Nginx.
- **Session**: Cookies (credentials: 'include') are set by the Gateway; the browser maintains them automatically.

## Development

```bash
pnpm dev
```

Runs `next dev` on `localhost:3000` (during active development only; not containerized).

## Deployment

1. Build: `docker build -f apps/client/Dockerfile -t sis-client:latest .`
2. NGINX serves `/out/` as static root.
3. All `/api/*` requests are proxied to Gateway by NGINX.

See infra/docker/docker-compose.yml for the `client` service definition.
