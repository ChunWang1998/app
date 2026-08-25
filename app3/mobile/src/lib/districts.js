import { COUNTY_CODE } from '../data/constants';

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

/** Live district list for one county code only. */
export async function fetchDistrictsForCity(city) {
  const code = COUNTY_CODE[city];
  if (!code) return [];
  const xml = await fetchText(`${NLSC}/ListTown/${code}`);
  const names = xmlTags(xml, 'townname');
  return names.filter(Boolean);
}
