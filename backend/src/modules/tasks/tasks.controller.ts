import { Controller, Get, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common'
import { Request } from 'express'
import { TasksService } from './tasks.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { DeleteTaskDto } from './dto/delete-task.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { writeAudit } from '../../common/utils/audit'
import { DatabaseService } from '../../database/database.service'
import type { TTokenPayload } from '../auth/auth.types'

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly db:           DatabaseService,
  ) {}

  @Get('tasks')
  getAll(@CurrentUser() user: TTokenPayload) {
    return this.tasksService.getAll(user.id)
  }

  @Post('task/create')
  @HttpCode(200)
  async create(@CurrentUser() user: TTokenPayload, @Body() dto: CreateTaskDto, @Req() req: Request) {
    const task = await this.tasksService.create(user.id, dto)
    writeAudit(this.db.db, user.id, 'task.create', task.id, req.ip ?? null)
    return task
  }

  @Post('task/update')
  @HttpCode(200)
  async update(@CurrentUser() user: TTokenPayload, @Body() dto: UpdateTaskDto, @Req() req: Request) {
    const task = await this.tasksService.update(user.id, dto)
    writeAudit(this.db.db, user.id, 'task.update', dto.id, req.ip ?? null)
    return task
  }

  @Post('task/delete')
  @HttpCode(200)
  async delete(
    @CurrentUser() user: TTokenPayload,
    @Body() body: DeleteTaskDto,
    @Req() req: Request,
  ) {
    await this.tasksService.delete(user.id, body.id)
    writeAudit(this.db.db, user.id, 'task.delete', body.id, req.ip ?? null)
    return { message: 'OK' }
  }
}
