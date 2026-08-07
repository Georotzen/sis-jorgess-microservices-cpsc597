# Docker Compose patch — Keycloak realm auto-import

Your existing `infra/docker/docker-compose.yml` (from Phase 1) has a
`keycloak` service using `start-dev`. Update it to mount and import
the realm export from Phase 2:

```yaml
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    command: start-dev --import-realm
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: changeme
    volumes:
      - ../keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json
    ports:
      - "8080:8080"
```

The only changes from Phase 1 are the `command` (added `--import-realm`)
and the new `volumes` entry. Everything else in the compose file is
unchanged.

Also add the two new services to the compose file once their
Dockerfiles are filled in (still placeholders from Phase 1 — real
multi-stage NestJS builds are a good next step alongside Phase 3):

```yaml
  gateway:
    build: ../../services/gateway
    env_file: ../../services/gateway/.env
    depends_on: [keycloak]
    ports:
      - "3000:3000"

  identity:
    build: ../../services/identity
    env_file: ../../services/identity/.env
    depends_on: [identity-db, keycloak, rabbitmq]
    ports:
      - "3001:3001"
```

(These `gateway`/`identity` blocks already exist as bare `build:`
entries from the Phase 1 scaffold — this just adds `env_file` and
`ports` now that the services have real `.env.example` files to
copy from.)
