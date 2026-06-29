import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2'
import * as mysql from 'mysql2/promise'
import * as schema from './schema'

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name)
  private pool!: mysql.Pool

  db!: MySql2Database<typeof schema>

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.pool = mysql.createPool({
      uri:                this.config.get<string>('DATABASE_URL'),
      waitForConnections: true,
      connectionLimit:    10,
      charset:            'utf8mb4',
      timezone:           'Z',
    })

    this.db = drizzle(this.pool, { schema, mode: 'default' })

    const conn = await this.pool.getConnection()
    this.logger.log('Connected to MySQL')
    conn.release()
  }
}
