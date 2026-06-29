import { Agent as HttpAgent } from 'http'
import { Agent as HttpsAgent } from 'https'
import { lookup as dnsLookup } from 'dns'
import { isIP } from 'net'
import type { LookupFunction } from 'net'
import { BadRequestException } from '@nestjs/common'

// Защита от SSRF: не даём ходить во внутреннюю сеть по ссылкам, которые задаёт пользователь
// (contact_info.personal_site / company_site). Проверяем как литералы-IP, так и адреса,
// в которые резолвится хост (включая редиректы), чтобы закрыть DNS-rebinding.

const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return true
  const [a, b] = parts as [number, number, number, number]
  if (a === 0 || a === 10 || a === 127) return true          // this-network, private, loopback
  if (a === 169 && b === 254) return true                    // link-local (включая 169.254.169.254 — облачные метаданные)
  if (a === 172 && b >= 16 && b <= 31) return true           // private
  if (a === 192 && b === 168) return true                    // private
  if (a === 100 && b >= 64 && b <= 127) return true          // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true        // benchmarking
  if (a >= 224) return true                                   // multicast + reserved (224.0.0.0/3)
  return false
}

const isPrivateIpv6 = (ip: string): boolean => {
  const addr = ip.toLowerCase().split('%')[0]!                // отбрасываем zone-id (fe80::1%eth0)
  if (addr === '::1' || addr === '::') return true            // loopback / unspecified
  if (addr.startsWith('fe80')) return true                   // link-local
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true // unique-local fc00::/7
  if (addr.startsWith('ff')) return true                     // multicast
  const v4mapped = addr.match(/(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/)
  if (v4mapped) return isPrivateIpv4(v4mapped[1]!)           // ::ffff:a.b.c.d
  return false
}

export const isPrivateIp = (ip: string): boolean => {
  const type = isIP(ip)
  if (type === 4) return isPrivateIpv4(ip)
  if (type === 6) return isPrivateIpv6(ip)
  return true                                                 // не похоже на IP — считаем небезопасным
}

// Бросает, если хост-литерал указывает на приватный/внутренний адрес.
// Для доменных имён реальная проверка происходит в safeLookup при установке соединения.
export const assertPublicUrlHost = (rawHost: string): void => {
  let host = rawHost.trim()
  if (host.startsWith('[')) {
    const end = host.indexOf(']')
    host = end === -1 ? host.slice(1) : host.slice(1, end)    // [::1]:443 → ::1
  } else if (host.includes(':') && isIP(host) === 0) {
    host = host.split(':')[0]!                                // host:port → host (но не ломаем чистый IPv6)
  }
  if (isIP(host) && isPrivateIp(host)) {
    throw new BadRequestException('Доступ к внутренним адресам запрещён')
  }
}

// Кастомный DNS-lookup для http(s)-агента: режет соединение, если хост резолвится в приватный IP.
// Срабатывает на каждое подключение, включая редирект-хопы → защищает и от DNS-rebinding.
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...(options as object), all: true }, (err, addresses) => {
    if (err) {
      callback(err, '', 0)
      return
    }
    const list = addresses as unknown as { address: string; family: number }[]
    const bad = list.find(a => isPrivateIp(a.address))
    if (bad) {
      callback(new BadRequestException(`Заблокирован внутренний адрес: ${bad.address}`), '', 0)
      return
    }
    if ((options as { all?: boolean }).all) {
      ;(callback as unknown as (e: Error | null, a: typeof list) => void)(null, list)
      return
    }
    const first = list[0]
    if (!first) {
      callback(new BadRequestException('Не удалось разрешить адрес сайта'), '', 0)
      return
    }
    callback(null, first.address, first.family)
  })
}

export const ssrfHttpAgent  = new HttpAgent({ lookup: safeLookup })
export const ssrfHttpsAgent = new HttpsAgent({ lookup: safeLookup })

// Хук axios/follow-redirects: проверяет каждый редирект-хоп (протокол + IP-литерал).
export const ssrfBeforeRedirect = (options: { protocol?: string; hostname?: string; host?: string }): void => {
  const proto = (options.protocol ?? '').replace(/:$/, '')
  if (proto !== 'http' && proto !== 'https') {
    throw new BadRequestException('Недопустимый протокол редиректа')
  }
  assertPublicUrlHost(options.hostname ?? options.host ?? '')
}
