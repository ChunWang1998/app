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

/**
 * @param {string} key
 * @param {string} baseUrl
 */
async function fetchCell(key, baseUrl) {
  const root = String(baseUrl || '').replace(/\/$/, '')
  const url = `${root}/cells/${key}.json`
  const res = await fetch(url)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`places cell ${key}: HTTP ${res.status}`)
  const rows = await res.json()
  return Array.isArray(rows) ? rows : []
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

/** Clear in-memory cell cache (tests / hot reload). */
export function clearPlacesCache() {
  memoryCache.clear()
}
