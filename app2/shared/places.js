/** Spatial cell helpers + nearby place loading. CELL_SIZE must match buildDataSet.py */

export const CELL_SIZE = 0.02
/** Viewport cell fetch cap (~city-scale). Zoom out further → skip grid load. */
export const MAX_CELLS_PER_LOAD = 60
/** In-memory LRU cap (cells + cities). Disk cache is separate. */
export const MEMORY_CACHE_LIMIT = 200

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

/**
 * Cell keys that overlap a MapView region bounding box.
 * @param {{ latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number }} region
 */
export function cellKeysInRegion(region) {
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
  return keys
}

export function regionExceedsCellLimit(region) {
  if (!region) return true
  const latSpan = Math.abs(Number(region.latitudeDelta)) / CELL_SIZE
  const lngSpan = Math.abs(Number(region.longitudeDelta)) / CELL_SIZE
  if (!Number.isFinite(latSpan) || !Number.isFinite(lngSpan)) return true
  return Math.ceil(latSpan + 1e-9) * Math.ceil(lngSpan + 1e-9) > MAX_CELLS_PER_LOAD
}

const memoryCache = new Map()
const inflight = new Map()

function lruGet(key) {
  if (!memoryCache.has(key)) return undefined
  const value = memoryCache.get(key)
  memoryCache.delete(key)
  memoryCache.set(key, value)
  return value
}

function lruSet(key, value) {
  if (memoryCache.has(key)) memoryCache.delete(key)
  memoryCache.set(key, value)
  while (memoryCache.size > MEMORY_CACHE_LIMIT) {
    const oldest = memoryCache.keys().next().value
    memoryCache.delete(oldest)
  }
}

function asRows(data) {
  return Array.isArray(data) ? data : []
}

function cellPath(key) {
  return `cells/${key}.json`
}

function cityPath(city) {
  return `cities/${encodeURIComponent(city)}.json`
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
 * memory → disk adapter → network → bundled sync.
 *
 * @param {string} relPath
 * @param {{
 *   baseUrl?: string,
 *   cache?: boolean,
 *   cacheAdapter?: { get?: (p: string) => Promise<unknown[]|null>, set?: (p: string, rows: unknown[]) => Promise<void> },
 *   loadSync?: () => unknown[],
 * }} options
 */
async function readThrough(relPath, options) {
  const { baseUrl = '', cache = true, cacheAdapter, loadSync } = options

  if (cache) {
    const hit = lruGet(relPath)
    if (hit !== undefined) return hit
  }

  if (inflight.has(relPath)) return inflight.get(relPath)

  const job = (async () => {
    if (cache && cacheAdapter?.get) {
      try {
        const disk = await cacheAdapter.get(relPath)
        if (Array.isArray(disk) && disk.length) {
          if (cache) lruSet(relPath, disk)
          return disk
        }
      } catch (e) {
        console.warn('places disk cache get failed', relPath, e?.message || e)
      }
    }

    let rows = []
    if (baseUrl) {
      try {
        rows = await fetchJsonRows(relPath, baseUrl)
      } catch (e) {
        console.warn('places CDN load failed', relPath, e?.message || e)
        rows = []
      }
    }

    if (!rows.length && typeof loadSync === 'function') {
      rows = asRows(loadSync())
    }

    if (cache) lruSet(relPath, rows)

    if (cache && rows.length && cacheAdapter?.set) {
      try {
        await cacheAdapter.set(relPath, rows)
      } catch (e) {
        console.warn('places disk cache set failed', relPath, e?.message || e)
      }
    }

    return rows
  })()

  inflight.set(relPath, job)
  try {
    return await job
  } finally {
    inflight.delete(relPath)
  }
}

function mergeById(parts) {
  const byId = new Map()
  for (const row of parts.flat()) {
    if (row?.id != null) byId.set(row.id, row)
  }
  return [...byId.values()]
}

/**
 * Load full place records for the user's cell and neighbors.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {{
 *   baseUrl?: string,
 *   loadCellSync?: (key: string) => unknown[],
 *   cacheAdapter?: { get?: Function, set?: Function },
 *   cache?: boolean,
 * }} [options]
 */
export async function loadPlacesNear(lat, lng, options = {}) {
  const { loadCellSync } = options
  const keys = nearbyCellKeys(lat, lng)
  const parts = await Promise.all(
    keys.map((key) =>
      readThrough(cellPath(key), {
        ...options,
        loadSync: typeof loadCellSync === 'function' ? () => loadCellSync(key) : undefined,
      }),
    ),
  )
  return mergeById(parts)
}

/**
 * Load every place in a Taiwan city (高雄市, 台南市, …).
 *
 * @param {string} city
 * @param {{
 *   baseUrl?: string,
 *   loadCitySync?: (city: string) => unknown[],
 *   cacheAdapter?: { get?: Function, set?: Function },
 *   cache?: boolean,
 * }} [options]
 */
export async function loadPlacesByCity(city, options = {}) {
  const { loadCitySync } = options
  const name = String(city || '').trim()
  if (!name) return []
  return readThrough(cityPath(name), {
    ...options,
    loadSync: typeof loadCitySync === 'function' ? () => loadCitySync(name) : undefined,
  })
}

/**
 * Load places covering a map viewport. Returns [] if the region spans too many cells.
 *
 * @param {{ latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number }} region
 * @param {{
 *   baseUrl?: string,
 *   loadCellSync?: (key: string) => unknown[],
 *   cacheAdapter?: { get?: Function, set?: Function },
 *   cache?: boolean,
 * }} [options]
 */
export async function loadPlacesInRegion(region, options = {}) {
  if (regionExceedsCellLimit(region)) return []
  const { loadCellSync } = options
  const keys = cellKeysInRegion(region)
  const parts = await Promise.all(
    keys.map((key) =>
      readThrough(cellPath(key), {
        ...options,
        loadSync: typeof loadCellSync === 'function' ? () => loadCellSync(key) : undefined,
      }),
    ),
  )
  return mergeById(parts)
}

/** Clear in-memory cell cache (tests / hot reload). Disk cache is unchanged. */
export function clearPlacesCache() {
  memoryCache.clear()
  inflight.clear()
}
