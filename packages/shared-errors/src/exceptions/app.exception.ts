import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';

/**
 * Base exception every service should throw instead of raw HttpException,
 * so the global exception filter can always attach a stable ErrorCode.
 */
export class AppException extends HttpException {
  public readonly errorCode: ErrorCode;

  constructor(
    errorCode: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(message, status);
    this.errorCode = errorCode;
  }
}

export class NotFoundAppException extends AppException {
  constructor(message = 'Resource not found') {
    super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictAppException extends AppException {
  constructor(message = 'Resource conflict') {
    super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT);
  }
}

export class UnauthenticatedException extends AppException {
  constructor(message = 'Authentication required') {
    super(ErrorCode.UNAUTHENTICATED, message, HttpStatus.UNAUTHORIZED);
  }
}

export class TokenExpiredException extends AppException {
  constructor(message = 'Access token has expired') {
    super(ErrorCode.TOKEN_EXPIRED, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenActionException extends AppException {
  constructor(message = 'You do not have permission to perform this action') {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}

/**
 * Thrown when a caller has a valid token but lacks the required role
 * (e.g. a student calling a faculty-only grade-entry endpoint).
 */
export class InsufficientRoleException extends AppException {
  constructor(requiredRoles: string[]) {
    super(
      ErrorCode.INSUFFICIENT_ROLE,
      `Requires one of the following roles: ${requiredRoles.join(', ')}`,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class RateLimitedException extends AppException {
  constructor(message = 'Too many requests') {
    super(ErrorCode.RATE_LIMITED, message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

/** Domain-specific: Enrollment Service */
export class EnrollmentCapacityExceededException extends AppException {
  constructor(message = 'Course section has no remaining capacity') {
    super(
      ErrorCode.ENROLLMENT_CAPACITY_EXCEEDED,
      message,
      HttpStatus.CONFLICT,
    );
  }
}

export class EnrollmentAlreadyExistsException extends AppException {
  constructor(message = 'Student is already enrolled in this section') {
    super(ErrorCode.ENROLLMENT_ALREADY_EXISTS, message, HttpStatus.CONFLICT);
  }
}

/** Domain-specific: Grades Service */
export class NotInstructorOfRecordException extends AppException {
  constructor(
    message = 'Only the instructor of record may enter or modify this grade',
  ) {
    super(
      ErrorCode.GRADE_NOT_INSTRUCTOR_OF_RECORD,
      message,
      HttpStatus.FORBIDDEN,
    );
  }
}

/** Domain-specific: Student Profile Service */
export class ProfileFieldEncryptionException extends AppException {
  constructor(message = 'Failed to encrypt/decrypt a protected profile field') {
    super(
      ErrorCode.PROFILE_FIELD_ENCRYPTION_FAILURE,
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
