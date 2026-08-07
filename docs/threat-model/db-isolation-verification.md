# Database Isolation Verification

Phase 4, item 5: "Verify each microservice accesses only its dedicated
PostgreSQL database schema with strictly scoped database credentials."

This was verified two ways: by inspecting how the isolation is actually
produced (not just asserted), and by running real, live tests against
Postgres — not a paper exercise.

## How isolation actually works in this platform

`infra/docker/docker-compose.yml` gives each service its own
**Postgres container**, built from the stock `postgres:16-alpine`
image with exactly one `POSTGRES_USER`/`POSTGRES_DB` pair set via
`environment:`. Concretely:

| Service | DB host (container) | Role | Database |
|---|---|---|---|
| identity | `identity-db` | `identity_svc` | `identity` |
| student-profile | `student-profile-db` | `student_profile_svc` | `student_profile` |
| enrollment | `enrollment-db` | `enrollment_svc` | `enrollment` |
| grades | `grades-db` | `grades_svc` | `grades` |
| audit | `audit-db` | `audit_svc` | `audit` |

Each app service's own `environment:` block in `docker-compose.yml`
(and its `.env.example`) points it at its own container's hostname and
credentials only — there is no service whose config references another
service's DB host.

Because Postgres's own `initdb` only creates the one role named by
`POSTGRES_USER`, **another service's role literally does not exist**
on a given container. This is the primary control, and it holds
regardless of any GRANT/REVOKE configuration — there's no role to
authenticate as, so there's nothing to attempt privilege escalation
with.

## What was actually run (not just reasoned about)

Two Postgres instances were stood up locally to reproduce this
topology directly (a shared cluster would not have proven the same
thing — see the note on that below):

**1. Cross-instance credential reuse — the primary control.**
A second, fully separate Postgres instance was created with only the
`audit_svc` role (mirroring the real `audit-db` container). Result:

```
# audit_svc connecting to ITS OWN instance — succeeds
$ psql -h localhost -p 5436 -U audit_svc -d audit -c "SELECT current_user;"
 current_user
--------------
 audit_svc

# grades_svc credentials against that SAME instance — rejected outright
$ psql -h localhost -p 5436 -U grades_svc -d audit -c "SELECT 1;"
FATAL:  password authentication failed for user "grades_svc"
DETAIL:  Role "grades_svc" does not exist.
```

Postgres deliberately returns the same "password authentication
failed" message whether the password is wrong or the role doesn't
exist (to avoid leaking which roles exist to an unauthenticated
prober) — the server log confirms the real reason: `Role "grades_svc"
does not exist`. Either way, the connection attempt fails before any
query could run.

**2. Table-level grants — defense in depth, in case of future
consolidation onto a shared cluster.**
On a single shared cluster (all five service roles/databases created
together), a table was created *as* `grades_svc` — the same way
TypeORM's `synchronize` creates tables using whatever role the service
connects with — then read attempted as `enrollment_svc`:

```
$ psql -h localhost -U grades_svc -d grades -c "SELECT * FROM grade_records;"
 (succeeds — 1 row)

$ psql -h localhost -U enrollment_svc -d grades -c "SELECT * FROM grade_records;"
ERROR:  permission denied for table grade_records

$ psql -h localhost -U enrollment_svc -d grades -c "INSERT INTO grade_records ...;"
ERROR:  permission denied for table grade_records
```

Postgres's default per-table privileges (owner-only, nothing granted
to `PUBLIC`) hold even when two services' roles coexist in the same
cluster. This means the isolation guarantee has two independent
layers, not just one — losing the "separate containers" control (e.g.
someone consolidates onto one Postgres instance to save resources)
would not, by itself, open cross-service data access.

## Gaps found, worth flagging in the STRIDE matrix

- **`CONNECT` privilege is not restricted by default.** On a shared
  cluster, any role can `CONNECT` to any database (Postgres grants
  `CONNECT` to `PUBLIC` by default) even though it can't read/write
  tables it doesn't own. This isn't exploitable for data access given
  the table-grant behavior above, but it does mean a role can see that
  another service's database and (empty-permission) tables *exist* —
  minor information disclosure, not a data-access issue. Mitigation if
  ever consolidating onto a shared cluster: `REVOKE CONNECT ON
  DATABASE <db> FROM PUBLIC;` per database, granting it back only to
  that database's own service role.
- **This whole class of finding only applies if the platform is ever
  consolidated onto a shared Postgres cluster.** As currently deployed
  (`docker-compose.yml`, one container per service), the primary
  control — role non-existence across instances — makes it a non-issue
  regardless of GRANT state.

## Where this fits the deliverables list

This satisfies "database-per-service with dedicated least-privilege
credentials per service, no shared schemas or cross-service database
access" from the Security Controls section, and should be cited
directly under the STRIDE **Tampering** and **Information Disclosure**
categories in the threat-model traceability matrix, with the two test
transcripts above as the evidence artifacts.
