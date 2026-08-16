import * as Location from 'expo-location';

const LOCATE_TIMEOUT_MS = 6000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('location timeout')), ms);
    }),
  ]);
}

function coordsFrom(loc) {
  return { lat: loc.coords.latitude, lng: loc.coords.longitude };
}

/**
 * Same locate pattern as app2: last-known first, then low-accuracy current.
 * No city fallback — spec forbids a hardcoded city dropdown.
 */
export async function locateCoords() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    const err = new Error('location denied');
    err.code = 'denied';
    throw err;
  }

  let last = null;
  try {
    last = await Location.getLastKnownPositionAsync();
  } catch {
    last = null;
  }

  try {
    const loc = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      }),
      LOCATE_TIMEOUT_MS,
    );
    return coordsFrom(loc);
  } catch (e) {
    if (last) return coordsFrom(last);
    const err = new Error(e?.message || 'location failed');
    err.code = 'error';
    throw err;
  }
}

export async function expoReverseCity(coords) {
  try {
    const rows = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    const row = rows?.[0];
    if (!row) return null;
    return {
      cityRaw: row.city || row.region || row.subregion || '',
      districtRaw: row.district || row.subregion || row.city || '',
    };
  } catch {
    return null;
  }
}
