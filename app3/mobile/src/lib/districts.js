import { COUNTY_CODE, canonicalCity } from '../data/constants';

const NLSC = 'https://api.nlsc.gov.tw/other';

function xmlTags(xml, tag) {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/xml,text/xml,text/plain,*/*' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/** Reverse geocode via NLSC — lon,lat order. */
export async function reverseCityDistrict(coords) {
  const url = `${NLSC}/TownVillagePointQuery/${coords.lng}/${coords.lat}/4326`;
  const xml = await fetchText(url);
  const cityRaw = xmlTags(xml, 'ctyName')[0] || xmlTags(xml, 'ctyname')[0];
  const districtRaw =
    xmlTags(xml, 'townName')[0] || xmlTags(xml, 'townname')[0];
  if (!cityRaw) throw new Error('nlsc reverse empty');
  return { cityRaw, districtRaw: districtRaw || '' };
}

/** Live district list for one county code only. */
export async function fetchDistrictsForCity(city) {
  const code = COUNTY_CODE[city];
  if (!code) return [];
  const xml = await fetchText(`${NLSC}/ListTown/${code}`);
  const names = xmlTags(xml, 'townname');
  return names.filter(Boolean);
}

export function cityFromRaw(raw) {
  return canonicalCity(raw);
}
