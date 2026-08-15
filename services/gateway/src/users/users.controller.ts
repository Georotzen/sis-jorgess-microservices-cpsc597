// apps/api-gateway/src/users/users.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard } from '.././auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientProxy) {}

  // Handles GET /users/:id
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string, @Request() req: any) {
    return this.authClient.send(
      { cmd: 'get_user_by_id' },
      {
        user: req.user, // User identity context
        data: { userId: id },
      }
    );
  }

  // Handles POST /users
  @Post()
  @UseGuards(JwtAuthGuard)
  async createUser(@Body() createUserDto: any, @Request() req: any) {
    return this.authClient.send(
      { cmd: 'create_user' },
      {
        user: req.user,
        data: createUserDto,
      }
    );
  }
}