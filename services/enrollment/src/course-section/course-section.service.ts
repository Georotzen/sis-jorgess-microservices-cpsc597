import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundAppException } from '@sis/shared-errors';
import { CreateCourseSectionDto } from '@sis/shared-dtos';
import { CourseSection } from './course-section.entity';

@Injectable()
export class CourseSectionService {
  constructor(
    @InjectRepository(CourseSection)
    private readonly repo: Repository<CourseSection>,
  ) {}

  create(dto: CreateCourseSectionDto): Promise<CourseSection> {
    const section = this.repo.create({
      courseCode: dto.courseCode,
      title: dto.title,
      termId: dto.termId,
      instructorUserId: dto.instructorUserId,
      capacity: dto.capacity,
      enrolledCount: 0,
    });
    return this.repo.save(section);
  }

  async findById(id: string): Promise<CourseSection> {
    const section = await this.repo.findOne({ where: { id } });
    if (!section) {
      throw new NotFoundAppException(`Course section ${id} not found`);
    }
    return section;
  }

  findByTerm(termId?: string): Promise<CourseSection[]> {
    return this.repo.find(termId ? { where: { termId } } : {});
  }
}
