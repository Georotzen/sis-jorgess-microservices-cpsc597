import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundAppException } from '@sis/shared-errors';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async createLocalRecord(params: {
    id: string;
    email: string;
    fullName: string;
  }): Promise<User> {
    const user = this.usersRepo.create({
      id: params.id,
      email: params.email,
      fullName: params.fullName,
      isActive: true,
    });
    return this.usersRepo.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundAppException(`User ${id} not found`);
    }
    return user;
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.findById(id); // 404s if missing
    await this.usersRepo.update({ id }, { isActive });
  }
}
