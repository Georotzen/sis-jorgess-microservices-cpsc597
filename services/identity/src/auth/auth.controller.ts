import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  RegisterUserDto,
  LoginDto,
  RefreshTokenDto,
  AssignRoleDto,
  Role,
  AuthenticatedUser,
} from '@sis/shared-dtos';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';

@Controller('identity')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Public. No auth guard — anyone may register. The resulting account
   * is ALWAYS a student account; see AuthService.register().
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  /**
   * Requires a valid access token — you must be logged in to log out.
   * This isn't just symmetry: it's what lets us take actorUserId from
   * req.user (the validated JWT) for the audit event, rather than trusting
   * whatever the client claims in the body.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshTokenDto, @Req() req: { user: AuthenticatedUser }) {
    return this.authService.logout(dto, req.user.userId);
  }

  /**
   * Administrator-only. Protected at TWO layers, per the architecture's
   * "RBAC enforced at both gateway and service layers" requirement:
   *   1. The Gateway's introspection guard checks the role before this
   *      request is even routed here (services/gateway).
   *   2. JwtAuthGuard + RolesGuard check it again, independently, right
   *      here — so a Gateway misconfiguration or bypass alone is not
   *      enough to grant privilege escalation.
   */
  @Post('assign-role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  assignRole(@Body() dto: AssignRoleDto, @Req() req: { user: AuthenticatedUser }) {
    return this.authService.assignRole(dto, req.user.userId);
  }
}
