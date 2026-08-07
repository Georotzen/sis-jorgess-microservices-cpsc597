import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CreateStudentProfileDto,
  Role,
  STAFF_ROLES,
  StudentProfileSummaryDto,
  UpdateStudentProfileDto,
} from '@sis/shared-dtos';
import { ForbiddenActionException } from '@sis/shared-errors';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudentProfileService } from './student-profile.service';
import { StudentProfile } from './student-profile.entity';

/**
 * Every route here requires a valid, locally-verified token — there is
 * no public student-profile endpoint, so JwtAuthGuard is applied once
 * at the controller level instead of repeating it on each method (unlike
 * Identity's AuthController, which mixes public and protected routes).
 */
@Controller('student-profile')
@UseGuards(JwtAuthGuard)
export class StudentProfileController {
  constructor(private readonly profiles: StudentProfileService) {}

  /**
   * Self-service create. dto.userId is NOT trusted blindly — a caller
   * may only create a profile for themselves unless they're an
   * Administrator, otherwise a forged userId would let one student
   * create a profile under another student's identity.
   */
  @Post()
  create(
    @Body() dto: CreateStudentProfileDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<StudentProfile> {
    if (dto.userId !== req.user.userId && !req.user.roles.includes(Role.ADMINISTRATOR)) {
      throw new ForbiddenActionException('You may only create a profile for yourself');
    }
    return this.profiles.create(dto);
  }

  /**
   * The caller's own full profile, including SENSITIVE fields. Declared
   * before the `:userId` route below — Nest/Express would otherwise
   * match `/student-profile/me` as `:userId = "me"` if the wildcard
   * route were registered first.
   */
  @Get('me')
  getOwn(@Req() req: { user: AuthenticatedUser }): Promise<StudentProfile> {
    return this.profiles.findByUserId(req.user.userId);
  }

  /**
   * The caller's own contact info. See StudentProfileService.update for
   * why legal-identity fields aren't editable through this route.
   */
  @Patch('me')
  updateOwn(
    @Body() dto: UpdateStudentProfileDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<StudentProfile> {
    return this.profiles.update(req.user.userId, dto);
  }

  /**
   * Full unredacted profile for a specific student. Administrator-only —
   * per the architecture notes (and StudentProfileSummaryDto's own
   * comment in @sis/shared-dtos), only this service and Administrators
   * should ever see these fields unredacted.
   */
  @Get(':userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMINISTRATOR)
  getByUserId(@Param('userId') userId: string): Promise<StudentProfile> {
    return this.profiles.findByUserId(userId);
  }

  /**
   * Redacted lookup for faculty/administrators — e.g. finding a student
   * before entering a grade — without exposing legal name, DOB, phone,
   * or address.
   */
  @Get(':userId/summary')
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  async getSummary(@Param('userId') userId: string): Promise<StudentProfileSummaryDto> {
    const profile = await this.profiles.findByUserId(userId);
    return this.profiles.toSummary(profile);
  }
}
