# @sis/shared-errors

Shared error codes, custom exception classes, and a global NestJS
exception filter used by every backend service.

```json
"dependencies": {
  "@sis/shared-errors": "workspace:*"
}
```

## Usage

In each service's `main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter } from '@sis/shared-errors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(3000);
}
bootstrap();
```

In business logic, throw the specific exception rather than a raw
`HttpException`:

```ts
import { EnrollmentCapacityExceededException } from '@sis/shared-errors';

if (section.enrolledCount >= section.capacity) {
  throw new EnrollmentCapacityExceededException();
}
```

## Contents

- `enums/error-code.enum.ts` — stable, append-only `ErrorCode` values returned to clients
- `exceptions/app.exception.ts` — `AppException` base class + common/domain exceptions
- `filters/all-exceptions.filter.ts` — global filter producing the uniform `ErrorResponseBody`
- `interfaces/error-response.interface.ts` — the response shape itself

## Conventions

- Every error response has the same envelope: `{ success: false, error: { code, message, details?, correlationId? }, statusCode, path, timestamp }`.
- Unhandled/unexpected errors are logged server-side with full detail but
  return only a generic message to the client — never leak stack traces,
  raw DB errors, or PII/grade values in the response body.
- Add new domain exceptions here (not ad hoc in a service) so every
  service's error responses stay consistent for the Gateway and client.
