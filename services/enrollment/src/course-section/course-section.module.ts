import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseSection } from './course-section.entity';
import { CourseSectionService } from './course-section.service';
import { CourseSectionController } from './course-section.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CourseSection]), AuthModule],
  controllers: [CourseSectionController],
  providers: [CourseSectionService],
  exports: [CourseSectionService, TypeOrmModule],
})
export class CourseSectionModule {}
