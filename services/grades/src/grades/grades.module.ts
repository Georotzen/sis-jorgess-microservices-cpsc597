import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradeRecord } from './grade-record.entity';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { AuthModule } from '../auth/auth.module';
import { InstructorVerificationModule } from '../instructor-verification/instructor-verification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GradeRecord]),
    AuthModule,
    InstructorVerificationModule,
  ],
  controllers: [GradesController],
  providers: [GradesService],
})
export class GradesModule {}
