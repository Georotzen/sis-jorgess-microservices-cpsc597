import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CreateCourseSectionDto, Role, STAFF_ROLES } from '@sis/shared-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CourseSectionService } from './course-section.service';
import { CourseSection } from './course-section.entity';

@Controller('enrollment/sections')
@UseGuards(JwtAuthGuard)
export class CourseSectionController {
  constructor(private readonly sections: CourseSectionService) {}

  /** Faculty/Administrator only — students don't create sections. */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(...STAFF_ROLES)
  create(@Body() dto: CreateCourseSectionDto): Promise<CourseSection> {
    return this.sections.create(dto);
  }

  /**
   * Open to any authenticated user (students need this to browse
   * sections before enrolling) — course catalog data isn't sensitive
   * the way profile/grade data is, so no @Roles() restriction here.
   */
  @Get()
  list(@Query('termId') termId?: string): Promise<CourseSection[]> {
    return this.sections.findByTerm(termId);
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<CourseSection> {
    return this.sections.findById(id);
  }
}
