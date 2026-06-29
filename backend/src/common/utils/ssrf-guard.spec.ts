import { describe, it, expect } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { isPrivateIp, assertPublicUrlHost, ssrfBeforeRedirect } from './ssrf-guard'

describe('isPrivateIp', () => {
  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '93.184.216.34',
    '172.15.0.1', // на единицу ниже приватного 172.16–172.31
    '172.32.0.1', // на единицу выше приватного диапазона
  ])('публичный IPv4 %s → false', ip => {
    expect(isPrivateIp(ip)).toBe(false)
  })

  it.each([
    '0.0.0.0',          // this-network
    '10.0.0.1',         // private
    '127.0.0.1',        // loopback
    '169.254.169.254',  // link-local + облачные метаданные
    '172.16.0.1',       // private
    '172.31.255.255',   // private (верхняя граница)
    '192.168.1.1',      // private
    '100.64.0.1',       // CGNAT
    '198.18.0.5',       // benchmarking
    '224.0.0.1',        // multicast
    '255.255.255.255',  // reserved (>=224)
  ])('внутренний/зарезервированный IPv4 %s → true', ip => {
    expect(isPrivateIp(ip)).toBe(true)
  })

  it.each([
    '2606:4700:4700::1111', // публичный (Cloudflare DNS)
    '2001:4860:4860::8888', // публичный (Google DNS)
  ])('публичный IPv6 %s → false', ip => {
    expect(isPrivateIp(ip)).toBe(false)
  })

  it.each([
    '::1',                 // loopback
    '::',                  // unspecified
    'fe80::1',             // link-local
    'fc00::1',             // unique-local
    'fd12:3456::1',        // unique-local
    'ff02::1',             // multicast
    '::ffff:127.0.0.1',    // v4-mapped на loopback
    '::ffff:169.254.169.254', // v4-mapped на метаданные
  ])('внутренний IPv6 %s → true', ip => {
    expect(isPrivateIp(ip)).toBe(true)
  })

  it('отбрасывает zone-id у link-local (fe80::1%eth0)', () => {
    expect(isPrivateIp('fe80::1%eth0')).toBe(true)
  })

  it('строку, не похожую на IP, считает небезопасной', () => {
    expect(isPrivateIp('example.com')).toBe(true)
    expect(isPrivateIp('not-an-ip')).toBe(true)
  })
})

describe('assertPublicUrlHost', () => {
  it('доменное имя не бросает (реальная проверка — на этапе lookup)', () => {
    expect(() => assertPublicUrlHost('example.com')).not.toThrow()
    expect(() => assertPublicUrlHost('api.github.com')).not.toThrow()
  })

  it('публичный IP-литерал не бросает', () => {
    expect(() => assertPublicUrlHost('8.8.8.8')).not.toThrow()
    expect(() => assertPublicUrlHost('8.8.8.8:443')).not.toThrow()
  })

  it('приватный IPv4-литерал бросает BadRequestException', () => {
    expect(() => assertPublicUrlHost('127.0.0.1')).toThrow(BadRequestException)
    expect(() => assertPublicUrlHost('169.254.169.254')).toThrow(BadRequestException)
  })

  it('host:port с приватным IP бросает', () => {
    expect(() => assertPublicUrlHost('10.0.0.1:8080')).toThrow(BadRequestException)
  })

  it('IPv6 в квадратных скобках разбирается и проверяется', () => {
    expect(() => assertPublicUrlHost('[::1]:443')).toThrow(BadRequestException)
    expect(() => assertPublicUrlHost('[2606:4700:4700::1111]:443')).not.toThrow()
  })
})

describe('ssrfBeforeRedirect', () => {
  it('пропускает http/https на публичный хост', () => {
    expect(() => ssrfBeforeRedirect({ protocol: 'http:', hostname: 'example.com' })).not.toThrow()
    expect(() => ssrfBeforeRedirect({ protocol: 'https:', hostname: '8.8.8.8' })).not.toThrow()
  })

  it('блокирует недопустимый протокол редиректа', () => {
    expect(() => ssrfBeforeRedirect({ protocol: 'ftp:', hostname: 'example.com' }))
      .toThrow(/Недопустимый протокол/)
    expect(() => ssrfBeforeRedirect({ protocol: 'file:', hostname: 'example.com' }))
      .toThrow(BadRequestException)
  })

  it('блокирует редирект на внутренний адрес', () => {
    expect(() => ssrfBeforeRedirect({ protocol: 'https:', hostname: '127.0.0.1' }))
      .toThrow(BadRequestException)
  })
})
