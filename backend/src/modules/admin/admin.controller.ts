import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common'
import { AdminService } from './admin.service'
import { CreateUserDto } from './dto/create-user.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { TTokenPayload } from '../auth/auth.types'

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers() {
    return this.adminService.getAllUsers()
  }

  @Post('users/create')
  @HttpCode(200)
  createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto.name, dto.login, dto.password, dto.role)
  }

  @Delete('users/:id')
  @HttpCode(200)
  deleteUser(@CurrentUser() user: TTokenPayload, @Param('id') id: string) {
    return this.adminService.deleteUser(user.id, id)
  }
}
