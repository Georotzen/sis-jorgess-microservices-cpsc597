# Audit Service

Immutable, centralized audit trail of security-relevant events (logins,
role/permission changes, grade entries and modifications, enrollment
changes) for detection and forensics, per the platform's architecture
notes.

## Responsibilities

- **Consume** every message published to the shared `sis.audit` topic
  exchange by other services' `AuditPublisherService` (currently:
  identity, grades, enrollment) and persist each one as a new,
  immutable row.
- **Never** update or delete a persisted record. A correction is a new
  inbound event with a new `eventId`, not an edit.
- **Serve** an Administrator-only read API over that trail so the
  audit log is usable for investigation, not just theoretically
  complete.

This service owns its own dedicated PostgreSQL database (`audit`, via
`audit_svc`) — no other service reads from or writes to it directly.

## Database ownership

| Table            | Written by                          | Read by            |
|-------------------|--------------------------------------|---------------------|
| `audit_records`   | This service only (via the consumer) | This service's own read API only |

## Endpoints

All routes require a valid JWT and the `administrator` realm role.

- `GET /audit/events` — paginated, filterable list.
  Query params: `eventType`, `actorUserId`, `subjectUserId`,
  `sourceService`, `occurredFrom`, `occurredTo`, `page`, `pageSize`
  (max 200).
- `GET /audit/events/:id` — a single record by its row id.
- `GET /health` — unauthenticated liveness check.

## Messaging

- Exchange: `sis.audit` (topic, durable) — asserted by both publishers
  and this consumer, so either side can start first.
- Queue: `audit.events` (durable), bound with routing key `#` so this
  service automatically picks up every `AuditEventType`, including
  ones added later, without a code change here.
- Dead-letter exchange: `sis.audit.dlx` / queue `audit.events.dead-letter`
  — malformed payloads are dead-lettered immediately; a message that
  fails to persist is redelivered once, then dead-lettered.
- Delivery is at-least-once. Duplicate redelivery is handled by a
  unique constraint on `event_id` (the id assigned by the *publishing*
  service) — `AuditPersistenceService.recordIfNew` is idempotent.

## Known simplifications (call out in the STRIDE writeup)

- Publishers are fire-and-forget: a RabbitMQ outage does not block the
  publishing service's primary operation (e.g. login still succeeds),
  which means there is a real window where security-relevant actions
  could occur without a corresponding audit event. Monitoring on
  publish failures (see each publisher's warning log) is the
  compensating control, not a guarantee this can't happen.
- This consumer retries a failed persist exactly once before
  dead-lettering; it does not distinguish transient vs. permanent
  failures.
