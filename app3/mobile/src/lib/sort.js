import { MAX_PLACES, MAX_SLOTS } from '../data/constants';

export function richnessScore(owner) {
  if (!owner) return 0;
  let n = 0;
  if (owner.photoOk) n += 3;
  if (owner.breed) n += 1;
  if (owner.size) n += 1;
  if (owner.ageRange) n += 1;
  n += Math.min(4, (owner.personalities || []).length);
  n += Math.min(MAX_SLOTS, (owner.slots || []).length);
  n += Math.min(MAX_PLACES, (owner.places || []).length);
  if (owner.playWith) n += 1;
  if (owner.intro) n += 1;
  if (owner.district) n += 1;
  return n;
}

export function sortOwners(list) {
  return [...list].sort((a, b) => {
    const out = (b.outingCount || 0) - (a.outingCount || 0);
    if (out !== 0) return out;
    const rich = richnessScore(b) - richnessScore(a);
    if (rich !== 0) return rich;
    return String(a.registeredAt || '').localeCompare(String(b.registeredAt || ''));
  });
}

/** Crowns by outing count in one district; ties: connectCount then registeredAt. */
export function crownsForDistrict(list, district) {
  if (!district) return {};
  const rows = list
    .filter((o) => o.district === district && o.photoOk && !o.isGuide)
    .sort((a, b) => {
      const out = (b.outingCount || 0) - (a.outingCount || 0);
      if (out !== 0) return out;
      const c = (b.connectCount || 0) - (a.connectCount || 0);
      if (c !== 0) return c;
      return String(a.registeredAt || '').localeCompare(String(b.registeredAt || ''));
    });
  const map = {};
  rows.slice(0, 3).forEach((o, i) => {
    map[o.id] = i + 1;
  });
  return map;
}

export function isNewUser(owner) {
  return (owner?.outingCount || 0) === 0;
}
