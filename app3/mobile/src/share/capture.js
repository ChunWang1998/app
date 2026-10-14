import { SHARE_SIZES } from './config';

export async function captureCard(ref, sizeKey = 'feed') {
  const size = SHARE_SIZES[sizeKey] || SHARE_SIZES.feed;
  const ViewShot = require('react-native-view-shot');
  const captureRef = ViewShot.captureRef || ViewShot.default?.captureRef;
  if (!captureRef) throw new Error('view-shot unavailable');
  const uri = await captureRef(ref, {
    format: 'png',
    quality: 1,
    width: size.width,
    height: size.height,
    result: 'tmpfile',
  });
  return uri;
}
