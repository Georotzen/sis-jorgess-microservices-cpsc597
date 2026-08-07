# Nginx — Network Edge

The only host-facing HTTP(S) port in the platform. Terminates TLS,
applies WAF-lite pattern blocking and rate limiting, then reverse-
proxies to the Gateway (API traffic) and the client app (everything
else). See the "Security Controls by Layer" section of the
architecture notes for the requirements this implements.

## What's here

- `nginx.conf` — the full edge config (TLS, WAF, rate limiting,
  routing). Replaces the image's default `/etc/nginx/nginx.conf`
  entirely (see the `volumes:` mount in `docker-compose.yml`), not a
  `conf.d/` snippet.
- `generate-dev-cert.sh` — generates a self-signed cert for local dev.
  Run once before `docker compose up`:
  ```bash
  ./generate-dev-cert.sh
  ```
- `certs/` — gitignored. Never commit real certificates or keys here.

## TLS: dev vs. production

Local dev uses the self-signed cert from `generate-dev-cert.sh`,
which is why `docker compose`'s Gateway/client traffic will show a
browser warning until you trust it locally — expected, not a bug.

In a real deployment, certs should come from the platform's existing
Vault instance (PKI secrets engine) or an ACME client (e.g.
cert-manager if this ever moves to Kubernetes) — never checked into
source control, and never self-signed.

## WAF-lite: what it does and doesn't do

`nginx.conf` blocks requests whose query string, URI, or User-Agent
matches obvious SQLi/XSS/path-traversal patterns or known scanner
signatures, returning `403` before the request reaches the Gateway.

This is a coarse first filter, not a replacement for the Application
layer's own controls (parameterized queries/ORM usage, input
validation — see each service's `ValidationPipe`). A determined
attacker can usually evade regex-based blocking; a real deployment
should replace this with ModSecurity + the OWASP Core Rule Set. The
pattern lists here exist to document *what class* of request gets
blocked at the edge, for the STRIDE matrix and DAST baseline
comparison, not as a claim of comprehensive coverage.

## Rate limiting

Two zones, keyed by client IP:
- `api_zone` (10 req/s, burst 20) — applied to every `/identity`,
  `/student-profile`, `/enrollment`, `/grades`, `/audit` route.
- `static_zone` (30 req/s, burst 50) — applied to the client app and
  its static assets.

This is in addition to, not instead of, the Gateway's own
`@nestjs/throttler` — the two operate at different layers (edge vs.
application) and catch different failure modes (an L7 flood before it
reaches any service at all, vs. per-authenticated-user abuse the edge
can't see).

## Routing

| Path prefix | Proxied to | Auth enforced by |
|---|---|---|
| `/health` | Gateway | none (liveness probe) |
| `/identity`, `/student-profile`, `/enrollment`, `/grades`, `/audit` | Gateway | Gateway's `IntrospectionGuard`/`RolesGuard` |
| `/_next/static/*` | Client app | none (public static assets) |
| everything else | Client app | Client app itself |

Nginx does not make authorization decisions — it has no knowledge of
JWTs or roles. That stays entirely in the Gateway and each backend
service, per the architecture's defense-in-depth principle.

## Verified locally

This config was syntax-checked (`nginx -t`) and smoke-tested against a
local stand-in for the Gateway before being committed:
- TLS termination and the security headers above
- WAF-lite blocking (`403`) for a representative SQLi/XSS/traversal
  payload in the query string, while an equivalent legitimate request
  passes through
- Rate limiting actually returns `429` once the configured burst is
  exceeded
- `X-Forwarded-*`/`X-Real-IP` headers arrive correctly at the upstream
