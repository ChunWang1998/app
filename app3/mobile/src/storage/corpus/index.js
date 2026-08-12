import * as FileSystem from 'expo-file-system/legacy';
import { resolveWorkId } from './aliases';
import { CORPUS_DIR_NAME, STARTER_PACK_VERSION } from './config';
import {
  STARTER_CATALOG,
  STARTER_MANIFEST,
  STARTER_UNIT_MODULES,
} from './starterAssets';
import { getInstalledFullVersion, loadCorpusPrefs } from './prefs';

/** @typedef {{ id: string, title: string, shortTitle: string, source: string, unitCount: number, hasZhuyin?: boolean, pack?: string }} WorkMeta */
/** @typedef {{ id: number, text: string, zhuyin?: string[] }} Unit */
/** @typedef {{ id: string, title: string, shortTitle: string, source: string, units: Unit[] }} Work */

let initialized = false;
/** @type {WorkMeta[]} */
let catalogWorks = [];
/** @type {Map<string, Work>} */
const workCache = new Map();

function corpusRoot() {
  return `${FileSystem.documentDirectory}${CORPUS_DIR_NAME}/`;
}

function fullUnitsPath(workId) {
  return `${corpusRoot()}full/units/${workId}.json`;
}

function mergeCatalog() {
  const byId = new Map();
  for (const w of STARTER_CATALOG.works) {
    const id = resolveWorkId(w.id);
    byId.set(id, { ...w, id });
  }
  return byId;
}

/**
 * Load installed full-pack catalog entries from disk (if present).
 */
async function loadInstalledCatalogEntries() {
  const catalogPath = `${corpusRoot()}full/catalog.json`;
  try {
    const info = await FileSystem.getInfoAsync(catalogPath);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(catalogPath);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.works) ? parsed.works : [];
  } catch {
    return [];
  }
}

function workFromPayload(payload, meta) {
  return {
    id: meta.id,
    title: meta.title,
    shortTitle: meta.shortTitle,
    source: meta.source,
    units: payload.units || [],
  };
}

async function loadWorkUnits(workId) {
  const canonical = resolveWorkId(workId);
  if (workCache.has(canonical)) return workCache.get(canonical);

  const meta = catalogWorks.find((w) => w.id === canonical);
  if (!meta) return null;

  let payload = null;

  const fullPath = fullUnitsPath(canonical);
  const fullInfo = await FileSystem.getInfoAsync(fullPath);
  if (fullInfo.exists) {
    const raw = await FileSystem.readAsStringAsync(fullPath);
    payload = JSON.parse(raw);
  } else if (STARTER_UNIT_MODULES[canonical]) {
    payload = STARTER_UNIT_MODULES[canonical];
  }

  if (!payload?.units) return null;

  const work = workFromPayload(payload, meta);
  workCache.set(canonical, work);
  return work;
}

/**
 * Initialize catalog + preload starter works into memory cache.
 */
export async function initCorpus() {
  if (initialized) return;

  await loadCorpusPrefs();

  const byId = mergeCatalog();
  const installed = await loadInstalledCatalogEntries();
  for (const w of installed) {
    const id = resolveWorkId(w.id);
    const entry = { ...w, id };
    if (!byId.has(id)) byId.set(id, entry);
    else {
      const existing = byId.get(id);
      // Keep starter title/zhuyin flags when both packs have the same work.
      byId.set(id, {
        ...existing,
        ...entry,
        title: existing.hasZhuyin ? existing.title : entry.title,
        shortTitle: existing.hasZhuyin ? existing.shortTitle : entry.shortTitle,
        hasZhuyin: existing.hasZhuyin || entry.hasZhuyin,
        pack: entry.pack || existing.pack,
      });
    }
  }

  catalogWorks = [...byId.values()].sort((a, b) =>
    a.shortTitle.localeCompare(b.shortTitle, 'zh-Hant'),
  );

  for (const w of STARTER_CATALOG.works) {
    await loadWorkUnits(w.id);
  }

  initialized = true;
}

export function isCorpusReady() {
  return initialized;
}

/**
 * @returns {WorkMeta[]}
 */
export function listWorks() {
  return catalogWorks.map((w) => ({ ...w }));
}

/**
 * List sutra summaries (compatible with old listSutras).
 */
export function listSutras() {
  return listWorks().map(({ id, title, shortTitle, source, unitCount }) => ({
    id,
    title,
    shortTitle,
    source,
    unitCount,
  }));
}

/**
 * @param {string} workId
 * @returns {WorkMeta | undefined}
 */
export function getWorkMeta(workId) {
  const canonical = resolveWorkId(workId);
  return catalogWorks.find((w) => w.id === canonical);
}

/**
 * Sync get after init + starter preload (for room helpers).
 * @param {string} workId
 * @returns {Work | null}
 */
export function getSutra(workId) {
  const canonical = resolveWorkId(workId);
  return workCache.get(canonical) || null;
}

/**
 * @param {string} workId
 * @returns {Promise<Work | null>}
 */
export async function getWork(workId) {
  await initCorpus();
  return loadWorkUnits(workId);
}

/**
 * @param {string} workId
 * @param {number} unitIndex
 * @returns {Promise<Unit | null>}
 */
export async function getUnit(workId, unitIndex) {
  const work = await getWork(workId);
  if (!work) return null;
  return work.units[unitIndex] ?? null;
}

export function getCorpusStatus() {
  const fullVersion = getInstalledFullVersion();
  return {
    starterVersion: STARTER_PACK_VERSION,
    starterWorks: STARTER_MANIFEST.files?.length ?? STARTER_CATALOG.works.length,
    fullVersion,
    fullInstalled: Boolean(fullVersion),
    catalogCount: catalogWorks.length || STARTER_CATALOG.works.length,
  };
}

/** Clear in-memory cache after full-pack install or delete. */
export function resetCorpusCache() {
  initialized = false;
  catalogWorks = [];
  workCache.clear();
}
