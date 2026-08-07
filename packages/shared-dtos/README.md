# @sis/shared-dtos

Shared TypeScript DTOs, enums, and interface contracts used by every
service and the client. Import via the workspace protocol:

```json
"dependencies": {
  "@sis/shared-dtos": "workspace:*"
}
```

```ts
import { RegisterUserDto, Role, JwtPayload } from '@sis/shared-dtos';
```

## Contents

- `enums/` — `Role`, `EnrollmentStatus`, `AuditEventType`
- `interfaces/` — `JwtPayload`, `AuthenticatedUser`, `ApiResponse<T>`, pagination types
- `dto/` — request/response DTOs per domain: `auth`, `user`, `student-profile`, `enrollment`, `grade`, `audit-event`

## Conventions

- DTOs use `class-validator` decorators so the same class can be used
  directly with NestJS's `ValidationPipe` at both the Gateway and the
  owning service (defense in depth — validate at both layers).
- Fields commented `// SENSITIVE` in `student-profile.dto.ts` must be
  stored with field-level encryption at rest and must never be logged
  or included in audit event `metadata`.
- Self-registration (`RegisterUserDto`) can only ever request the
  `STUDENT` role. Elevated roles are granted only via `AssignRoleDto`,
  which should be gated to `ADMINISTRATOR` callers server-side.
- Enums are additive: never renumber or repurpose an existing value.
