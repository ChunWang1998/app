import { MAX_DOGS, normalizeSlot } from '../data/constants';

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyDog(partial = {}) {
  return {
    id: partial.id || uid('dog'),
    dogName: partial.dogName || '',
    breed: partial.breed || '',
    size: partial.size || '中型',
    ageRange: partial.ageRange || '1–3 歲',
    personalities: partial.personalities || [],
    playWith: partial.playWith || 'parallel',
    intro: partial.intro || '',
    photoUri: partial.photoUri || null,
    photoOk: Boolean(partial.photoOk || partial.photoUri),
    canPhoto: partial.canPhoto !== false,
  };
}

/** Lift legacy flat dog fields into dogs[0]. */
export function normalizeProfile(raw) {
  if (!raw) return null;
  let dogs = Array.isArray(raw.dogs) ? raw.dogs.map((d) => emptyDog(d)) : [];
  if (!dogs.length && (raw.dogName || raw.photoUri || raw.photoOk)) {
    dogs = [
      emptyDog({
        id: raw.dogId || `${raw.id || 'me'}-dog-1`,
        dogName: raw.dogName,
        breed: raw.breed,
        size: raw.size,
        ageRange: raw.ageRange,
        personalities: raw.personalities,
        playWith: raw.playWith,
        intro: raw.intro,
        photoUri: raw.photoUri,
        photoOk: raw.photoOk,
        canPhoto: raw.canPhoto,
      }),
    ];
  }
  if (!dogs.length) dogs = [emptyDog()];
  dogs = dogs.slice(0, MAX_DOGS);

  const primary = dogs[0];
  const photoOk = dogs.some((d) => d.photoOk && d.photoUri);
  return {
    ...raw,
    dogs,
    dogName: primary.dogName,
    breed: primary.breed,
    size: primary.size,
    ageRange: primary.ageRange,
    personalities: primary.personalities,
    playWith: primary.playWith,
    intro: primary.intro,
    photoUri: primary.photoUri,
    photoOk: photoOk || Boolean(primary.photoOk),
    canPhoto: primary.canPhoto,
    slots: (raw.slots || []).map((s) => normalizeSlot(s)),
    places: raw.places || [],
  };
}

export function primaryDog(profile) {
  const p = normalizeProfile(profile);
  return p?.dogs?.[0] || null;
}

export function dogById(profile, dogId) {
  const p = normalizeProfile(profile);
  if (!p) return null;
  return p.dogs.find((d) => d.id === dogId) || p.dogs[0] || null;
}

/**
 * One explore/detail card per dog. Connect still uses ownerId (= account id).
 */
export function flattenOwnersToDogCards(owners) {
  const cards = [];
  for (const owner of owners || []) {
    const normalized = normalizeProfile(owner);
    if (!normalized) continue;
    const dogs = (normalized.dogs || []).filter((d) => d.photoOk || owner.isGuide || owner.isSeed);
    const list = dogs.length ? dogs : normalized.dogs || [];
    for (const dog of list) {
      if (!dog.photoOk && !owner.isGuide && !owner.isSeed && !owner.isMe) continue;
      cards.push({
        ...normalized,
        ...dog,
        ownerId: owner.id,
        id: owner.id,
        dogId: dog.id,
        cardKey: `${owner.id}:${dog.id}`,
        ownerDogCount: list.length,
        dogName: dog.dogName,
        breed: dog.breed,
        size: dog.size,
        ageRange: dog.ageRange,
        personalities: dog.personalities,
        playWith: dog.playWith,
        intro: dog.intro,
        photoUri: dog.photoUri,
        photoOk: dog.photoOk,
        canPhoto: dog.canPhoto,
        ownerNick: normalized.ownerNick,
        city: normalized.city,
        district: normalized.district,
        slots: normalized.slots,
        places: normalized.places,
        outingCount: normalized.outingCount,
        connectCount: normalized.connectCount,
        captainCount: normalized.captainCount,
        memberCount: normalized.memberCount,
        captainScore: normalized.captainScore,
        registeredAt: normalized.registeredAt,
        isGuide: owner.isGuide,
        isSeed: owner.isSeed,
        isMe: owner.isMe,
        isGlobal: owner.isGlobal,
      });
    }
  }
  return cards;
}

export function displayNameForOwner(ownerLike) {
  if (!ownerLike) return '';
  const p = normalizeProfile(ownerLike);
  if (!p) return ownerLike.dogName || '';
  if ((p.dogs || []).length <= 1) return p.dogs[0]?.dogName || p.dogName || '';
  return (p.dogs || []).map((d) => d.dogName).filter(Boolean).join('、') || p.dogName || '';
}
