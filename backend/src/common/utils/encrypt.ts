import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { Logger } from '@nestjs/common'

const ALGORITHM = 'aes-256-gcm'
const logger    = new Logger('Encryption')

// Текущая версия ключа — пишется в новые шифротексты как первый сегмент `v<N>:iv:tag:payload`.
// Для ротации: сохранить старый ключ в ENCRYPTION_KEY_PREVIOUS, новый — в ENCRYPTION_KEY,
// увеличить ENCRYPTION_KEY_VERSION. Старые данные останутся читаемыми через previous-ключ,
// новые будут шифроваться текущим. Записи без префикса версии (legacy) расшифровываются текущим ключом.
const CURRENT_VERSION = process.env['ENCRYPTION_KEY_VERSION'] ?? '1'

const parseKey = (hex: string | undefined, name: string): Buffer => {
  if (!hex || hex.length !== 64) throw new Error(`${name} must be 64 hex chars (32 bytes)`)
  return Buffer.from(hex, 'hex')
}

const getKey = (): Buffer => parseKey(process.env['ENCRYPTION_KEY'], 'ENCRYPTION_KEY')

const getKeyForVersion = (version: string): Buffer => {
  if (version === CURRENT_VERSION) return getKey()

  const previousVersion = process.env['ENCRYPTION_KEY_PREVIOUS_VERSION']
  if (version === previousVersion) {
    return parseKey(process.env['ENCRYPTION_KEY_PREVIOUS'], 'ENCRYPTION_KEY_PREVIOUS')
  }

  throw new Error(`Unknown encryption key version: ${version}`)
}

const isLegacyEncrypted = (text: string): boolean => {
  const parts = text.split(':')
  return (
    parts.length === 3 &&
    /^[0-9a-f]{32}$/.test(parts[0]!) &&
    /^[0-9a-f]{32}$/.test(parts[1]!)
  )
}

const isVersionedEncrypted = (text: string): boolean => {
  const parts = text.split(':')
  return (
    parts.length === 4 &&
    /^v\d+$/.test(parts[0]!) &&
    /^[0-9a-f]{32}$/.test(parts[1]!) &&
    /^[0-9a-f]{32}$/.test(parts[2]!)
  )
}

export const encrypt = (text: string | null): string | null => {
  if (!text) return text
  const iv      = randomBytes(16)
  const cipher  = createCipheriv(ALGORITHM, getKey(), iv)
  const payload = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `v${CURRENT_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${payload.toString('hex')}`
}

export const decrypt = (text: string | null): string | null => {
  if (!text) return text

  let key: Buffer
  let ivHex: string
  let authTagHex: string
  let payloadHex: string

  if (isVersionedEncrypted(text)) {
    const [versionPart, iv, authTag, payload] = text.split(':') as [string, string, string, string]
    try {
      key = getKeyForVersion(versionPart.slice(1))
    } catch (err) {
      logger.error('Failed to resolve encryption key', err instanceof Error ? err.stack : err)
      return null
    }
    ivHex = iv
    authTagHex = authTag
    payloadHex = payload
  } else if (isLegacyEncrypted(text)) {
    const [iv, authTag, payload] = text.split(':') as [string, string, string]
    key = getKey()
    ivHex = iv
    authTagHex = authTag
    payloadHex = payload
  } else {
    return text
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    return Buffer.concat([
      decipher.update(Buffer.from(payloadHex, 'hex')),
      decipher.final(),
    ]).toString('utf8')
  } catch (err) {
    logger.error('Failed to decrypt value', err instanceof Error ? err.stack : err)
    return null
  }
}
