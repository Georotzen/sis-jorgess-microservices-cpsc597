import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  AuthenticatedUser,
  CreateEnrollmentDto,
  EnrollmentStatus,
  Role,
  STAFF_ROLES,
  UpdateEnrollmentStatusDto,
} from '@sis/shared-dtos';
import { ForbiddenActionException } from '@sis/shared-errors';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EnrollmentService } from './enrollment.service';
import { Enrollment } from './enrollment.entity';

/**
 * Every route here requires a valid, locally-verified token — applied
 * once at the controller level, same reasoning as Student Profile.
 */
@Controller('enrollment')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollments: EnrollmentService) {}

  /**
   * Self-service enrollment. dto.studentId is NOT trusted blindly —
   * same rule as Student Profile's create(): a caller may only enroll
   * themselves unless they're an Administrator.
   */
  @Post()
  create(
    @Body() dto: CreateEnrollmentDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<Enrollment> {
    if (dto.studentId !== req.user.userId && !req.user.roles.includes(Role.ADMINISTRATOR)) {
      throw new ForbiddenActionException('You may only enroll yourself');
    }
    return this.enrollments.create(dto);
  }

  /**
   * The caller's own enrollment history. Declared before `:id` below —
   * same routing-order reasoning as Student Profile's `me` route.
   */
  @Get('me')
  getOwn(@Req() req: { user: AuthenticatedUser }): Promise<Enrollment[]> {
    return this.enrollments.findForStudent(req.user.userId);
  }

  /** Faculty/Administrator roster view for a section. */
  @Get('sections/:sectionId/roster')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  getRoster(@Param('sectionId') sectionId: string): Promise<Enrollment[]> {
    return this.enrollments.findForSection(sectionId);
  }

  /** Owner or staff only — a student can't view another student's enrollment. */
  @Get(':id')
  async get(
    @Param('id') id: string,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<Enrollment> {
    const enrollment = await this.enrollments.findById(id);
    this.assertOwnerOrStaff(enrollment, req.user);
    return enrollment;
  }

  /**
   * Status transitions: a student may only move their OWN enrollment to
   * DROPPED (self-drop). Every other transition — promoting someone off
   * the waitlist, marking COMPLETED, etc. — is Faculty/Administrator only.
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentStatusDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<Enrollment> {
    const enrollment = await this.enrollments.findById(id);
    const isOwner = enrollment.studentId === req.user.userId;
    const isStaff = req.user.roles.some((r) => STAFF_ROLES.includes(r));
    const isSelfDrop = isOwner && dto.status === EnrollmentStatus.DROPPED;

    if (!isStaff && !isSelfDrop) {
      throw new ForbiddenActionException(
        'You may only drop your own enrollment; other status changes require Faculty/Administrator',
      );
    }
    return this.enrollments.updateStatus(id, dto);
  }

  private assertOwnerOrStaff(enrollment: Enrollment, user: AuthenticatedUser): void {
    const isOwner = enrollment.studentId === user.userId;
    const isStaff = user.roles.some((r) => STAFF_ROLES.includes(r));
    if (!isOwner && !isStaff) {
      throw new ForbiddenActionException('You may only view your own enrollments');
    }
  }
}
