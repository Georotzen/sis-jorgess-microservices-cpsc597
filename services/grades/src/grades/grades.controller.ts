import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  AuthenticatedUser,
  EnterGradeDto,
  Role,
  STAFF_ROLES,
} from '@sis/shared-dtos';
import { ForbiddenActionException, NotFoundAppException } from '@sis/shared-errors';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GradesService } from './grades.service';
import { GradeRecord } from './grade-record.entity';

interface GradeView {
  studentId: string;
  courseSectionId: string;
  letterGrade: string;
  updatedAt: string;
  comment?: string;
}

/**
 * Every route here requires a valid, locally-verified token — applied
 * once at the controller level, same reasoning as every other service.
 */
@Controller('grades')
@UseGuards(JwtAuthGuard)
export class GradesController {
  constructor(private readonly grades: GradesService) {}

  /** Faculty (verified instructor-of-record) or Administrator only. */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.FACULTY, Role.ADMINISTRATOR)
  enterGrade(
    @Body() dto: EnterGradeDto,
    @Req() req: { user: AuthenticatedUser; headers: Record<string, string | undefined> },
  ): Promise<GradeRecord> {
    return this.grades.enterGrade(dto, req.user, req.headers.authorization);
  }

  /** The caller's own current grades across every section — never includes comments. */
  @Get('me')
  async getOwn(@Req() req: { user: AuthenticatedUser }): Promise<GradeView[]> {
    const records = await this.grades.getCurrentGradesForStudent(req.user.userId);
    return records.map((r) => this.toView(r, false));
  }

  /**
   * Current grade for one student+section. Owner or staff only —
   * comments are only ever included for staff, per GradeDto's own
   * docstring in @sis/shared-dtos ("No instructor comments unless
   * advisor role"). This platform has no separate advisor role, so
   * STAFF_ROLES (Faculty/Administrator) stands in for it.
   */
  @Get(':studentId/:courseSectionId')
  async getOne(
    @Param('studentId') studentId: string,
    @Param('courseSectionId') courseSectionId: string,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<GradeView> {
    const isOwner = req.user.userId === studentId;
    const isStaff = req.user.roles.some((r) => STAFF_ROLES.includes(r));
    if (!isOwner && !isStaff) {
      throw new ForbiddenActionException('You may only view your own grades');
    }

    const record = await this.grades.getCurrentGrade(studentId, courseSectionId);
    if (!record) {
      throw new NotFoundAppException(
        `No grade found for student ${studentId} in section ${courseSectionId}`,
      );
    }
    return this.toView(record, isStaff);
  }

  /**
   * Full immutable history for one student+section. Staff-only — kept
   * to STAFF_ROLES broadly rather than re-verifying instructor-of-record
   * on every read (that would mean a service-to-service call on every
   * history GET, not just on entry); a known, documented simplification
   * rather than an oversight.
   */
  @Get(':studentId/:courseSectionId/history')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getHistory(
    @Param('studentId') studentId: string,
    @Param('courseSectionId') courseSectionId: string,
  ): Promise<GradeRecord[]> {
    return this.grades.getHistory(studentId, courseSectionId);
  }

  private toView(record: GradeRecord, includeComment: boolean): GradeView {
    const view: GradeView = {
      studentId: record.studentId,
      courseSectionId: record.courseSectionId,
      letterGrade: record.newGrade,
      updatedAt: record.changedAt.toISOString(),
    };
    if (includeComment && record.comment) {
      view.comment = record.comment;
    }
    return view;
  }
}
