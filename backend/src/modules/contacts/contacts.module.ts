import { Module } from '@nestjs/common'
import { ContactsController } from './contacts.controller'
import { ContactsService } from './contacts.service'
import { ContactLogsService } from './contact-logs.service'

@Module({
  controllers: [ContactsController],
  providers:   [ContactsService, ContactLogsService],
  exports:     [ContactsService, ContactLogsService],
})
export class ContactsModule {}
