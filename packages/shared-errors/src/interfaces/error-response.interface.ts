import { ErrorCode } from '../enums/error-code.enum';

/**
 * Uniform error envelope. Every service's exception filter must produce
 * exactly this shape so the Gateway and client can handle errors
 * generically without service-specific parsing.
 */
export interface ErrorResponseBody {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    /** Field-level validation errors, if applicable. Never include raw field values here (avoid leaking PII/grades in error payloads). */
    details?: Array<{ field: string; constraint: string }>;
    /** Correlation id for cross-service tracing / support requests. */
    correlationId?: string;
  };
  statusCode: number;
  path: string;
  timestamp: string; // ISO 8601
}
