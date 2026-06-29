import {
  Controller, Get, Post, Body, Param, UseGuards,
  UseInterceptors, UploadedFile, Req, Res, HttpCode,
  UnsupportedMediaTypeException, NotFoundException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { basename, extname, join } from 'path'
import { unlink } from 'fs/promises'
import { fileTypeFromFile } from 'file-type'
import { Request, Response } from 'express'
import { ContactsService } from './contacts.service'
import { ContactLogsService } from './contact-logs.service'
import { CreateContactDto } from './dto/create-contact.dto'
import { UpdateContactDto } from './dto/update-contact.dto'
import { DeleteContactDto, DeleteContactsBulkDto } from './dto/delete-contact.dto'
import { ResolveLogDto } from './dto/resolve-log.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { writeAudit } from '../../common/utils/audit'
import { DatabaseService } from '../../database/database.service'
import type { TTokenPayload } from '../auth/auth.types'

const ALLOWED_PHOTO_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
}

const photoStorage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_PHOTO_MIME_TYPES[file.mimetype] ?? extname(file.originalname)
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const photoFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_PHOTO_MIME_TYPES[file.mimetype]) {
    cb(new UnsupportedMediaTypeException('Допустимы только изображения JPEG, PNG или WebP'), false)
    return
  }
  cb(null, true)
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(
    private readonly contactsService:   ContactsService,
    private readonly contactLogsService: ContactLogsService,
    private readonly db:                DatabaseService,
  ) {}

  @Get('uploads/:filename')
  async getPhoto(
    @CurrentUser() user: TTokenPayload,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const safe = basename(filename)
    if (safe !== filename || !/^[a-zA-Z0-9._-]+$/.test(safe)) {
      throw new NotFoundException('Файл не найден')
    }

    const owns = await this.contactsService.userOwnsPhoto(user.id, safe)
    if (!owns) throw new NotFoundException('Файл не найден')

    res.sendFile(join(process.cwd(), 'uploads', safe), err => {
      if (err && !res.headersSent) res.status(404).json({ message: 'Файл не найден', errors: [] })
    })
  }

  @Get('contact/:contactId/logs')
  async getLogs(@CurrentUser() user: TTokenPayload, @Param('contactId') contactId: string) {
    const logs = await this.contactLogsService.getByContactId(user.id, contactId)
    return { logs }
  }

  @Post('contact/:contactId/logs/:logId/resolve')
  @HttpCode(200)
  resolveLog(
    @CurrentUser() user: TTokenPayload,
    @Param('contactId') contactId: string,
    @Param('logId') logId: string,
    @Body() dto: ResolveLogDto,
  ) {
    return this.contactLogsService.resolveConflict(user.id, contactId, logId, dto.field, dto.choice)
  }

  @Get('contacts')
  getAll(@CurrentUser() user: TTokenPayload) {
    return this.contactsService.getAll(user.id)
  }

  @Get('contacts/export')
  exportData(@CurrentUser() user: TTokenPayload) {
    return this.contactsService.exportData(user.id)
  }

  @Get('contact/:id')
  getById(@CurrentUser() user: TTokenPayload, @Param('id') id: string) {
    return this.contactsService.getById(user.id, id)
  }

  @Post('contact/create')
  @HttpCode(200)
  async create(@CurrentUser() user: TTokenPayload, @Body() dto: CreateContactDto, @Req() req: Request) {
    const contact = await this.contactsService.create(user.id, dto)
    writeAudit(this.db.db, user.id, 'contact.create', contact.id, req.ip ?? null)
    return contact
  }

  @Post('contact/update')
  @HttpCode(200)
  async update(@CurrentUser() user: TTokenPayload, @Body() dto: UpdateContactDto, @Req() req: Request) {
    const contact = await this.contactsService.update(user.id, dto)
    writeAudit(this.db.db, user.id, 'contact.update', dto.id, req.ip ?? null)
    return contact
  }

  @Post('contact/delete')
  @HttpCode(200)
  async delete(
    @CurrentUser() user: TTokenPayload,
    @Body() body: DeleteContactDto,
    @Req() req: Request,
  ) {
    await this.contactsService.delete(user.id, body.id)
    writeAudit(this.db.db, user.id, 'contact.delete', body.id, req.ip ?? null)
    return { message: 'OK' }
  }

  @Post('contact/delete-bulk')
  @HttpCode(200)
  async deleteBulk(
    @CurrentUser() user: TTokenPayload,
    @Body() body: DeleteContactsBulkDto,
    @Req() req: Request,
  ) {
    const result = await this.contactsService.deleteBulk(user.id, body.ids)
    for (const id of result.deleted) {
      writeAudit(this.db.db, user.id, 'contact.delete', id, req.ip ?? null)
    }
    return result
  }

  @Post('contact/photo')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('photo', {
    storage: photoStorage,
    fileFilter: photoFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadPhoto(
    @CurrentUser() user: TTokenPayload,
    @Body() body: DeleteContactDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const detected = await fileTypeFromFile(file.path)
    if (!detected || !ALLOWED_PHOTO_MIME_TYPES[detected.mime]) {
      await unlink(file.path).catch(() => {})
      throw new UnsupportedMediaTypeException('Допустимы только изображения JPEG, PNG или WebP')
    }

    // Удаляем старый файл с диска перед заменой
    const existing = await this.contactsService.getById(user.id, body.id).catch(() => null)
    const oldFilename = existing?.photo ? basename(existing.photo) : null

    try {
      const contact = await this.contactsService.setPhoto(user.id, body.id, file.filename)
      if (oldFilename) await unlink(join(process.cwd(), 'uploads', oldFilename)).catch(() => {})
      writeAudit(this.db.db, user.id, 'contact.photo', body.id, req.ip ?? null)
      return { photo: contact.photo }
    } catch (err) {
      await unlink(file.path).catch(() => {})
      throw err
    }
  }

  @Post('contact/photo/delete')
  @HttpCode(200)
  async deletePhoto(
    @CurrentUser() user: TTokenPayload,
    @Body() body: DeleteContactDto,
    @Req() req: Request,
  ) {
    const existing = await this.contactsService.getById(user.id, body.id)
    const oldFilename = existing.photo ? basename(existing.photo) : null

    const contact = await this.contactsService.setPhoto(user.id, body.id, null)
    if (oldFilename) await unlink(join(process.cwd(), 'uploads', oldFilename)).catch(() => {})
    writeAudit(this.db.db, user.id, 'contact.photo', body.id, req.ip ?? null)
    return { photo: contact.photo }
  }
}
