/** Spatial cell helpers + nearby place loading. CELL_SIZE must match buildDataSet.py */

export const CELL_SIZE = 0.02

/**
 * @param {number} lat
 * @param {number} lng
 */
export function cellKey(lat, lng) {
  return `${Math.floor(lat / CELL_SIZE)}_${Math.floor(lng / CELL_SIZE)}`
}

/**
 * Own cell + 8 neighbors (edge-safe for nearest search).
 * @param {number} lat
 * @param {number} lng
 */
export function nearbyCellKeys(lat, lng) {
  const i = Math.floor(lat / CELL_SIZE)
  const j = Math.floor(lng / CELL_SIZE)
  const keys = []
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      keys.push(`${i + di}_${j + dj}`)
    }
  }
  return keys
}

const memoryCache = new Map()

function asRows(data) {
  return Array.isArray(data) ? data : []
}

/**
 * @param {string} path relative to baseUrl, e.g. `cells/1_2.json`
 * @param {string} baseUrl
 */
async function fetchJsonRows(path, baseUrl) {
  const root = String(baseUrl || '').replace(/\/$/, '')
  const url = `${root}/${path}`
  const res = await fetch(url)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`places ${path}: HTTP ${res.status}`)
  return asRows(await res.json())
}

/**
 * @param {string} key
 * @param {string} baseUrl
 */
async function fetchCell(key, baseUrl) {
  return fetchJsonRows(`cells/${key}.json`, baseUrl)
}

/**
 * @param {string} city
 * @param {string} baseUrl
 */
async function fetchCity(city, baseUrl) {
  return fetchJsonRows(`cities/${encodeURIComponent(city)}.json`, baseUrl)
}

/**
 * Load full place records for the user's cell and neighbors.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {{
 *   baseUrl?: string,
 *   loadCellSync?: (key: string) => unknown[],
 *   cache?: boolean,
 * }} [options]
 *   - baseUrl: HTTP root that serves `cells/{key}.json` (e.g. `/places` or CDN)
 *   - loadCellSync: offline/bundled fallback (mobile registry) when baseUrl is empty
 */
export async function loadPlacesNear(lat, lng, options = {}) {
  const { baseUrl = '', loadCellSync, cache = true } = options
  const keys = nearbyCellKeys(lat, lng)
  const parts = await Promise.all(
    keys.map(async (key) => {
      if (cache && memoryCache.has(key)) return memoryCache.get(key)

      let rows
      if (baseUrl) {
        rows = await fetchCell(key, baseUrl)
      } else if (typeof loadCellSync === 'function') {
        rows = loadCellSync(key) || []
      } else {
        rows = []
      }

      if (cache) memoryCache.set(key, rows)
      return rows
    }),
  )

  const byId = new Map()
  for (const row of parts.flat()) {
    if (row?.id != null) byId.set(row.id, row)
  }
  return [...byId.values()]
}

/**
 * Load every place in a Taiwan city (高雄市, 台南市, …).
 * Tries CDN first, then bundled `loadCitySync` so Expo works before deploy.
 *
 * @param {string} city
 * @param {{
 *   baseUrl?: string,
 *   loadCitySync?: (city: string) => unknown[],
 *   cache?: boolean,
 * }} [options]
 */
export async function loadPlacesByCity(city, options = {}) {
  const { baseUrl = '', loadCitySync, cache = true } = options
  const name = String(city || '').trim()
  if (!name) return []

  const cacheKey = `city:${name}`
  if (cache && memoryCache.has(cacheKey)) return memoryCache.get(cacheKey)

  let rows = []
  if (baseUrl) {
    try {
      rows = await fetchCity(name, baseUrl)
    } catch (e) {
      console.warn('city CDN load failed', name, e?.message || e)
      rows = []
    }
  }
  if (!rows.length && typeof loadCitySync === 'function') {
    rows = asRows(loadCitySync(name))
  }

  if (cache && rows.length) memoryCache.set(cacheKey, rows)
  return rows
}

/**
 * Load places covering a map viewport region (viewport-based, no city file).
 * Computes all cell keys that overlap the bounding box and loads them.
 *
 * @param {{ latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number }} region
 * @param {{ baseUrl?: string, loadCellSync?: (key: string) => unknown[], cache?: boolean }} [options]
 */
export async function loadPlacesInRegion(region, options = {}) {
  const { baseUrl = '', loadCellSync, cache = true } = options
  const latMin = region.latitude - region.latitudeDelta / 2
  const latMax = region.latitude + region.latitudeDelta / 2
  const lngMin = region.longitude - region.longitudeDelta / 2
  const lngMax = region.longitude + region.longitudeDelta / 2

  const iMin = Math.floor(latMin / CELL_SIZE)
  const iMax = Math.floor(latMax / CELL_SIZE)
  const jMin = Math.floor(lngMin / CELL_SIZE)
  const jMax = Math.floor(lngMax / CELL_SIZE)

  const keys = []
  for (let i = iMin; i <= iMax; i++) {
    for (let j = jMin; j <= jMax; j++) {
      keys.push(`${i}_${j}`)
    }
  }

  const parts = await Promise.all(
    keys.map(async (key) => {
      if (cache && memoryCache.has(key)) return memoryCache.get(key)
      let rows
      if (baseUrl) {
        rows = await fetchCell(key, baseUrl)
      } else if (typeof loadCellSync === 'function') {
        rows = loadCellSync(key) || []
      } else {
        rows = []
      }
      if (cache) memoryCache.set(key, rows)
      return rows
    }),
  )

  const byId = new Map()
  for (const row of parts.flat()) {
    if (row?.id != null) byId.set(row.id, row)
  }
  return [...byId.values()]
}

/** Clear in-memory cell cache (tests / hot reload). */
export function clearPlacesCache() {
  memoryCache.clear()
}
