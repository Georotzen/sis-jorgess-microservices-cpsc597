# Workspace with Phase 5 client

Install and build the monorepo:

```bash
pnpm install
pnpm build
```

## Phase 5: Client SPA

The Next.js client is now part of `apps/client`:

- **static output**: Built with `output: 'export'` in `next.config.js`
- **zero Node.js runtime**: Containerized in Alpine, outputs only static HTML/CSS/JS (~9MB)
- **same-origin calls**: All API calls use relative paths (`/identity/login`, `/api/...`), not absolute URLs
- **Nginx proxy**: Nginx serves the static client and proxies `/api/*` and service routes to the Gateway
- **CORS/auth**: Handled by the Gateway (services/gateway/src/main.ts)

## Docker Compose

With Phase 5, the stack now includes:

```yaml
services:
  client:      # Static Next.js SPA in Alpine
  nginx:       # Reverse proxy for client + API gateway
  gateway:     # NestJS API gateway
  identity:    # Identity microservice (listening on localhost:5432 for dev)
  student-profile:  # Student profile service
  enrollment:       # Enrollment service
  grades:           # Grades service
  audit:            # Audit & logging service
  keycloak:         # Auth server
  redis:            # Session store
  rabbitmq:         # Event bus
  vault:            # Secrets
  [all DBs]:        # One per service
```

Bring everything up:

```bash
cd infra/docker
docker compose up -d
```

Access at `http://localhost:8888` (port 8888 = Nginx on port 80).

## Development

To work on the client locally with hot reload:

```bash
pnpm --filter @sis/client dev
```

This runs `next dev` on `localhost:3000`. For API calls to work during local dev, you'll need to update `src/lib/api.ts` to point to the running gateway (e.g., `http://localhost:8888` when containers are up).

Alternatively, run the full stack in containers and access the static client through Nginx at `http://localhost:8888`.

## API Integration

### Example: Login

```typescript
// src/app/login/page.tsx
const response = await apiCall('/identity/login', 'POST', { email, password });
setToken(response.token);
setUser(response.user);
```

The browser sends `POST http://localhost:8888/identity/login` (HTTP requests use relative paths), Nginx matches the regex `^/(identity|...)` and proxies to the Gateway, which routes to the Identity service.

### Example: Fetch Student Profile

```typescript
const profile = await apiCall('/student-profile/me', 'GET');
```

Same pattern: relative path → Nginx → Gateway → microservice.

All requests include `credentials: 'include'`, so session cookies set by the Gateway are automatically sent with each request.

## Ports

- `8888`: NGINX (HTTP)
- `8889`: NGINX (HTTPS, with dev cert)
- `9080`: Keycloak admin UI
- `15672`: RabbitMQ admin UI

## Next Steps

1. **Implement login/logout**: Update `src/app/login/page.tsx` with the actual response shape from your Identity service.
2. **Add more pages**: Create additional routes in `src/app/` (e.g., `/src/app/profile/page.tsx`).
3. **Error handling**: Improve the API client (`src/lib/api.ts`) with retry logic, error boundaries, and fallbacks.
4. **Testing**: Add E2E tests with Playwright or Cypress that exercise the full stack (client → Nginx → Gateway → microservice).
5. **CI/CD**: In GitHub Actions, build the client and Gateway in the docker build step (Phase 5 is containerized).

The development environment is operational. The Identity service is running locally with hot reload, and the rest of the stack is in Docker.
