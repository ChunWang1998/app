/** @typedef {{ open: string, close: string }} HoursSlot */
/** @typedef {{ raw: string, allDay: boolean, unknown: boolean, byDay: Record<string, HoursSlot[]> }} HoursSpec */
/** @typedef {{ id: string, type: string, name: string, 地址: string, lat: number, lng: number, 營業時間: string|HoursSpec, 備註: string[] }} ToiletPlace */
/** @typedef {{ lat: number, lng: number }} LatLng */

const EARTH_RADIUS_M = 6371000

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

/** ISO weekday 1=Mon … 7=Sun */
export function isoWeekday(date = new Date()) {
  const js = date.getDay()
  return js === 0 ? 7 : js
}

/**
 * @param {string|HoursSpec} hours
 * @param {Date} [now]
 */
export function isOpenNow(hours, now = new Date()) {
  if (typeof hours === 'string') {
    const raw = (hours || '').trim()
    if (!raw) return true
    if (/24\s*h/i.test(raw) || raw.includes('24小時') || raw === '24') return true
    const match = raw.match(/(\d{1,2}):(\d{2})\s*[~～\-–—]\s*(\d{1,2}):(\d{2})/)
    if (!match) return true
    const openMin = Number(match[1]) * 60 + Number(match[2])
    const closeMin = Number(match[3]) * 60 + Number(match[4])
    const nowMin = now.getHours() * 60 + now.getMinutes()
    if (closeMin <= openMin) return nowMin >= openMin || nowMin < closeMin
    return nowMin >= openMin && nowMin < closeMin
  }

  if (!hours || typeof hours !== 'object') return true
  if (hours.unknown) return true
  if (hours.allDay) return true

  const dayKey = String(isoWeekday(now))
  const slots = (hours.byDay && hours.byDay[dayKey]) || []
  if (!slots.length) return false

  const nowMin = now.getHours() * 60 + now.getMinutes()
  for (const slot of slots) {
    const openMin = toMinutes(slot.open)
    const closeMin = toMinutes(slot.close)
    if (openMin == null || closeMin == null) continue
    if (closeMin <= openMin) {
      if (nowMin >= openMin || nowMin < closeMin) return true
    } else if (nowMin >= openMin && nowMin < closeMin) {
      return true
    }
  }
  return false
}

/** @param {string|HoursSpec|null|undefined} hours */
export function formatHours(hours) {
  if (!hours) return '營業時間未提供'
  if (typeof hours === 'string') return hours || '營業時間未提供'
  if (hours.raw) return hours.raw
  if (hours.allDay) return '24H'
  return '營業時間未提供'
}

/**
 * @param {LatLng} a
 * @param {LatLng} b
 */
export function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/**
 * @param {LatLng} user
 * @param {ToiletPlace[]} places
 * @param {number} [n]
 */
export function nearestOpen(user, places, n = 3) {
  return places
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .filter((p) => isOpenNow(p.營業時間))
    .map((p) => ({
      ...p,
      distance: haversineMeters(user, { lat: p.lat, lng: p.lng }),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n)
}

/**
 * @param {number} meters
 */
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}
