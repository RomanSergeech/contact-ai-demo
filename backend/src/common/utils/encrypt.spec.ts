import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// AES-256-GCM. CURRENT_VERSION и ключи читаются из env (часть — на этапе импорта модуля),
// поэтому ротацию проверяем через vi.resetModules + динамический импорт с разным окружением.

const KEY_A = 'a'.repeat(64) // 32 байта hex
const KEY_B = 'b'.repeat(64)

const importEncrypt = async () => import('./encrypt')

describe('encrypt/decrypt (одна версия ключа)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('ENCRYPTION_KEY', KEY_A)
    vi.stubEnv('ENCRYPTION_KEY_VERSION', '1')
    vi.stubEnv('ENCRYPTION_KEY_PREVIOUS', '')
    vi.stubEnv('ENCRYPTION_KEY_PREVIOUS_VERSION', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('roundtrip: расшифровка возвращает исходный текст', async () => {
    const { encrypt, decrypt } = await importEncrypt()
    const enc = encrypt('секретные данные')
    expect(enc).not.toBe('секретные данные')
    expect(decrypt(enc)).toBe('секретные данные')
  })

  it('пишет формат с префиксом версии v1:iv:tag:payload', async () => {
    const { encrypt } = await importEncrypt()
    const enc = encrypt('x')!
    const parts = enc.split(':')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('v1')
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/) // iv 16 байт
    expect(parts[2]).toMatch(/^[0-9a-f]{32}$/) // authTag 16 байт
  })

  it('каждый вызов даёт новый IV (разные шифротексты одного текста)', async () => {
    const { encrypt, decrypt } = await importEncrypt()
    const a = encrypt('повтор')
    const b = encrypt('повтор')
    expect(a).not.toBe(b)
    expect(decrypt(a)).toBe('повтор')
    expect(decrypt(b)).toBe('повтор')
  })

  it('null и пустую строку пропускает без изменений', async () => {
    const { encrypt, decrypt } = await importEncrypt()
    expect(encrypt(null)).toBeNull()
    expect(encrypt('')).toBe('')
    expect(decrypt(null)).toBeNull()
    expect(decrypt('')).toBe('')
  })

  it('обычную (нешифрованную) строку возвращает как есть', async () => {
    const { decrypt } = await importEncrypt()
    expect(decrypt('просто текст')).toBe('просто текст')
    expect(decrypt('not:encrypted:value:here')).toBe('not:encrypted:value:here')
  })

  it('расшифровывает legacy-формат без префикса версии (iv:tag:payload)', async () => {
    const { encrypt, decrypt } = await importEncrypt()
    const enc = encrypt('legacy')!
    const legacy = enc.split(':').slice(1).join(':') // убираем v1:
    expect(decrypt(legacy)).toBe('legacy')
  })

  it('подмена authTag → расшифровка проваливается и возвращает null', async () => {
    const { encrypt, decrypt } = await importEncrypt()
    const [v, iv, tag, payload] = encrypt('tamper')!.split(':')
    const flipped = tag.startsWith('0') ? '1' + tag.slice(1) : '0' + tag.slice(1)
    expect(decrypt(`${v}:${iv}:${flipped}:${payload}`)).toBeNull()
  })

  it('подмена payload → расшифровка проваливается и возвращает null', async () => {
    const { encrypt, decrypt } = await importEncrypt()
    const [v, iv, tag, payload] = encrypt('tamper2')!.split(':')
    const flipped = payload.startsWith('0') ? '1' + payload.slice(1) : '0' + payload.slice(1)
    expect(decrypt(`${v}:${iv}:${tag}:${flipped}`)).toBeNull()
  })

  it('encrypt бросает при невалидном ключе (не 64 hex)', async () => {
    vi.stubEnv('ENCRYPTION_KEY', 'short')
    const { encrypt } = await importEncrypt()
    expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY must be 64 hex/)
  })
})

describe('ротация ключей', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('текст, зашифрованный старым ключом (v1), читается после ротации через previous-ключ', async () => {
    // Шаг 1: шифруем ключом A как версия 1
    vi.resetModules()
    vi.stubEnv('ENCRYPTION_KEY', KEY_A)
    vi.stubEnv('ENCRYPTION_KEY_VERSION', '1')
    const old = await importEncrypt()
    const encV1 = old.encrypt('до ротации')!
    expect(encV1.startsWith('v1:')).toBe(true)

    // Шаг 2: ротация — текущий ключ B (версия 2), старый A уходит в previous (версия 1)
    vi.resetModules()
    vi.stubEnv('ENCRYPTION_KEY', KEY_B)
    vi.stubEnv('ENCRYPTION_KEY_VERSION', '2')
    vi.stubEnv('ENCRYPTION_KEY_PREVIOUS', KEY_A)
    vi.stubEnv('ENCRYPTION_KEY_PREVIOUS_VERSION', '1')
    const rotated = await importEncrypt()

    expect(rotated.decrypt(encV1)).toBe('до ротации')      // старые данные читаемы
    expect(rotated.encrypt('после')!.startsWith('v2:')).toBe(true) // новые пишутся версией 2
  })

  it('неизвестная версия ключа → decrypt возвращает null', async () => {
    vi.resetModules()
    vi.stubEnv('ENCRYPTION_KEY', KEY_B)
    vi.stubEnv('ENCRYPTION_KEY_VERSION', '2')
    vi.stubEnv('ENCRYPTION_KEY_PREVIOUS', '')
    vi.stubEnv('ENCRYPTION_KEY_PREVIOUS_VERSION', '')
    const { encrypt, decrypt } = await importEncrypt()
    const enc = encrypt('x')!
    const unknownVersion = enc.replace(/^v2:/, 'v9:')
    expect(decrypt(unknownVersion)).toBeNull()
  })
})
