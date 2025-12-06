import { Controller, Post, Body } from '@nestjs/common';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';

@Controller('auth')
export class AuthController {
    constructor(private usersService: UsersService) { }


    @Post('register')
    async register(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto)
    }



}
