import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditEventType, Role } from '@sis/shared-dtos';
import { NotFoundAppException } from '@sis/shared-errors';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditPersistenceService } from './audit-persistence.service';
import { AuditRecord } from './audit-record.entity';

interface PaginatedAuditResult {
  items: AuditRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const MAX_PAGE_SIZE = 200;

/**
 * Administrator-only. "Immutable" must not mean "inaccessible" — this
 * is the read side of the audit trail, used for detection/forensics
 * (Phase 7) and for the STRIDE Repudiation mitigation to actually be
 * checkable rather than theoretical. There is intentionally no write
 * or delete route anywhere in this controller.
 *
 * Kept to ADMINISTRATOR rather than STAFF_ROLES (unlike Grades'
 * history endpoint) — a Faculty member has no platform-level need to
 * see login/role-change events for arbitrary other users, whereas
 * Grades' STAFF_ROLES scoping was specifically about grade data
 * Faculty are already trusted with.
 */
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATOR)
export class AuditController {
  constructor(private readonly persistence: AuditPersistenceService) {}

  @Get('events')
  async list(
    @Query('eventType') eventType?: AuditEventType,
    @Query('actorUserId') actorUserId?: string,
    @Query('subjectUserId') subjectUserId?: string,
    @Query('sourceService') sourceService?: string,
    @Query('occurredFrom') occurredFrom?: string,
    @Query('occurredTo') occurredTo?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ): Promise<PaginatedAuditResult> {
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || 50));

    const { items, total } = await this.persistence.findMany({
      eventType,
      actorUserId,
      subjectUserId,
      sourceService,
      occurredFrom: occurredFrom ? new Date(occurredFrom) : undefined,
      occurredTo: occurredTo ? new Date(occurredTo) : undefined,
      page: parsedPage,
      pageSize: parsedPageSize,
    });

    return {
      items,
      page: parsedPage,
      pageSize: parsedPageSize,
      totalItems: total,
      totalPages: Math.ceil(total / parsedPageSize) || 1,
    };
  }

  @Get('events/:id')
  async getOne(@Param('id') id: string): Promise<AuditRecord> {
    const record = await this.persistence.findById(id);
    if (!record) {
      throw new NotFoundAppException(`No audit record found with id ${id}`);
    }
    return record;
  }
}
