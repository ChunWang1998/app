import { ICON_KINDS } from '../data/models';

const FILES = {
  brush: require('../../assets/widget/icon-brush.png'),
  drop: require('../../assets/widget/icon-drop.png'),
  pill: require('../../assets/widget/icon-pill.png'),
  leaf: require('../../assets/widget/icon-leaf.png'),
  bed: require('../../assets/widget/icon-bed.png'),
  scissors: require('../../assets/widget/icon-scissors.png'),
  car: require('../../assets/widget/icon-car.png'),
  eye: require('../../assets/widget/icon-eye.png'),
  logo: require('../../assets/widget/logo.png'),
};

async function copyAsset(dir, fileName, moduleId) {
  const { Asset } = require('expo-asset');
  const FileSystem = require('expo-file-system');
  const dest = `${String(dir).replace(/\/?$/, '/')}${fileName}`;
  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (info?.exists) return dest;
  } catch {}
  const asset = await Asset.fromModule(moduleId).downloadAsync();
  const from = asset.localUri || asset.uri;
  if (!from) return null;
  try {
    await FileSystem.copyAsync({ from, to: dest });
  } catch {
    try {
      await FileSystem.downloadAsync(from, dest);
    } catch {
      return from;
    }
  }
  return dest;
}

export async function ensureWidgetAssets() {
  let dir = null;
  try {
    dir = require('expo-widgets').widgetsDirectory;
  } catch {
    return null;
  }
  if (!dir) return null;
  const iconUris = {};
  for (const kind of ICON_KINDS) {
    // No bundled PNG (e.g. paw, mono): the widget falls back to the SF Symbol.
    if (!FILES[kind]) continue;
    const uri = await copyAsset(dir, `icon-${kind}.png`, FILES[kind]);
    if (uri) iconUris[kind] = uri;
  }
  const logoUri = await copyAsset(dir, 'logo.png', FILES.logo);
  return { iconUris, logoUri };
}
