import { Controller, Post, Body, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom} from 'rxjs';

@Controller('identity')
export class IdentityController {
  constructor(private readonly http: HttpService) {}

  @Post('login')
  async login(@Body() body: any) {
    const identityUrl = 'http://identity-service:3000/login, body';
  try {
    const response = await firstValueFrom(
      this.http.post(identityUrl, body)
    );

    return response.data;

  } catch (error) {
    const axiosError = error as AxiosError;
    throw new HttpException(
      axiosError.response?.data || 'Identity service error',
      axiosError.response?.status || 500
    );
  }
 }
}
