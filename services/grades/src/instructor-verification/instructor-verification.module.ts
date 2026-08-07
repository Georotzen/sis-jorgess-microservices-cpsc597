import { Module } from '@nestjs/common';
import { InstructorVerificationService } from './instructor-verification.service';

@Module({
  providers: [InstructorVerificationService],
  exports: [InstructorVerificationService],
})
export class InstructorVerificationModule {}
