import { Module } from '@nestjs/common'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'
import { ContactsModule } from '../contacts/contacts.module'

@Module({
  imports:     [ContactsModule],
  controllers: [TasksController],
  providers:   [TasksService],
})
export class TasksModule {}
