import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser, Role } from '@sis/shared-dtos';
import { IntrospectionGuard } from './guards/introspection.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

/**
 * Demonstrates the two-guard pattern every protected route in the
 * Gateway should follow. Actual routing to backend services (Identity,
 * Student Profile, Enrollment, Grades) is built out in Phase 3 — this
 * controller exists in Phase 2 purely to prove the introspection +
 * RBAC guard chain works end to end before wiring real proxying on
 * top of it.
 */
@Controller('auth')
export class AuthDemoController {
  @Get('me')
  @UseGuards(IntrospectionGuard)
  me(@Req() req: Request & { user: AuthenticatedUser }) {
    return req.user;
  }

  @Get('admin-check')
  @UseGuards(IntrospectionGuard, RolesGuard)
  @Roles(Role.ADMINISTRATOR)
  adminCheck() {
    return { ok: true, message: 'You are an administrator.' };
  }
}
