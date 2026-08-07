import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './enrollment.entity';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { CourseSectionModule } from '../course-section/course-section.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment]),
    // Imported for its CourseSection TypeOrmModule.forFeature registration
    // — EnrollmentService touches CourseSection rows via the raw
    // DataSource/EntityManager inside a transaction (see enrollment.service.ts),
    // not via CourseSectionService, but the entity still needs to be
    // registered in this module graph.
    CourseSectionModule,
    AuthModule,
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
})
export class EnrollmentModule {}
