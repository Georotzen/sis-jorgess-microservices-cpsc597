import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { NotInstructorOfRecordException } from '@sis/shared-errors';

/**
 * Confirms, against Enrollment's own authoritative CourseSection record
 * — not just the caller's claimed role — that a given user is actually
 * the instructor of record for a course section.
 *
 * This exists because a valid FACULTY-role token only proves someone is
 * *a* faculty member, not that they own *this specific* section.
 * EnterGradeDto's docstring (@sis/shared-dtos) requires the Grades
 * service to verify that independently rather than trust the Gateway's
 * role check alone — and since Grades and Enrollment are separate
 * services with separate databases, "independently" necessarily means
 * a network call, not a local query.
 *
 * The call forwards the ORIGINAL caller's own Authorization header
 * rather than minting a service credential — there is no
 * service-to-service auth mechanism in this platform yet (see the
 * gateway's Phase 3 notes), so this piggybacks on the fact that
 * Enrollment's own JwtAuthGuard will independently re-validate that
 * same token against the same Keycloak realm.
 */
@Injectable()
export class InstructorVerificationService {
  private readonly enrollmentServiceUrl =
    process.env.ENROLLMENT_SERVICE_URL ?? 'http://enrollment:3000';

  /**
   * Fails CLOSED: a network error, timeout, missing section, or role
   * mismatch all result in the same NotInstructorOfRecordException. A
   * grade entry that can't be positively verified must never be treated
   * as if it had been — there is no "assume yes" path here.
   */
  async assertInstructorOfRecord(
    courseSectionId: string,
    instructorUserId: string,
    authorizationHeader: string | undefined,
  ): Promise<void> {
    if (!authorizationHeader) {
      throw new NotInstructorOfRecordException(
        'Missing credentials required to verify instructor-of-record status',
      );
    }

    let section: { instructorUserId?: string };
    try {
      const response = await axios.get<{ instructorUserId?: string }>(
        `${this.enrollmentServiceUrl}/enrollment/sections/${courseSectionId}`,
        { headers: { authorization: authorizationHeader }, timeout: 5000 },
      );
      section = response.data;
    } catch {
      // Deliberately not distinguishing "section not found" from
      // "Enrollment is unreachable" in the response to the caller —
      // both mean grade entry cannot proceed, and a more specific error
      // here would only help someone probing which section ids exist.
      throw new NotInstructorOfRecordException(
        'Could not verify instructor-of-record status for this course section',
      );
    }

    if (section.instructorUserId !== instructorUserId) {
      throw new NotInstructorOfRecordException();
    }
  }
}
