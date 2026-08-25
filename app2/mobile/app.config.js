const appJson = require('./app.json');

module.exports = () => {
  const googleMapsApiKey = String(
    process.env.GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      '',
  ).trim();

  if (
    process.env.EAS_BUILD === 'true' &&
    process.env.EAS_BUILD_PLATFORM === 'android' &&
    !googleMapsApiKey
  ) {
    throw new Error(
      'GOOGLE_MAPS_API_KEY is required for Android EAS builds. Without it the standalone APK crashes as soon as MapView mounts. Add the key to mobile/.env, then run npm run eas:env:push:preview (and eas:env:push:production).',
    );
  }

  const expo = appJson.expo;
  return {
    ...expo,
    newArchEnabled: false,
    android: {
      ...expo.android,
      config: {
        ...(expo.android?.config || {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
