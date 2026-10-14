const fs = require('fs');
const path = require('path');
const { withEntitlementsPlist, withBaseMod, withFinalizedMod } = require('expo/config-plugins');

/**
 * expo-notifications and expo-widgets add aps-environment (remote push).
 * Been Ages only schedules local notifications, so strip that entitlement
 * from the main app and every widget / extension target.
 *
 * withEntitlementsPlist actions run before later plugins in the same chain,
 * so also wrap the entitlements mod and delete again after nextMod, then
 * walk every .entitlements file after prebuild writes them.
 */

function stripAps(results) {
  if (results?.modResults) delete results.modResults['aps-environment'];
  if (results?.ios?.entitlements) delete results.ios.entitlements['aps-environment'];
  return results;
}

function stripApsFromXml(xml) {
  return String(xml).replace(/\s*<key>aps-environment<\/key>\s*<string>[^<]*<\/string>/g, '');
}

function walkEntitlements(dir, seen = new Set()) {
  if (!dir || !fs.existsSync(dir)) return;
  let real;
  try {
    real = fs.realpathSync(dir);
  } catch {
    return;
  }
  if (seen.has(real)) return;
  seen.add(real);
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (name === 'Pods' || name === 'build' || name === 'node_modules') continue;
    const p = path.join(dir, name);
    let st;
    try {
      st = fs.lstatSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkEntitlements(p, seen);
    else if (name.endsWith('.entitlements')) {
      const xml = fs.readFileSync(p, 'utf8');
      const next = stripApsFromXml(xml);
      if (next !== xml) fs.writeFileSync(p, next);
    }
  }
}

function withStripApsEnvironment(config) {
  if (config.ios?.entitlements) {
    delete config.ios.entitlements['aps-environment'];
  }
  config = withEntitlementsPlist(config, (mod) => stripAps(mod));
  config = withBaseMod(config, {
    platform: 'ios',
    mod: 'entitlements',
    async action({ modRequest: { nextMod, ...modRequest }, ...cfg }) {
      if (typeof nextMod !== 'function') {
        return stripAps({ ...cfg, modRequest });
      }
      const results = await nextMod({ ...cfg, modRequest });
      return stripAps(results);
    },
  });
  return withFinalizedMod(config, [
    'ios',
    async (mod) => {
      walkEntitlements(mod.modRequest.platformProjectRoot);
      return mod;
    },
  ]);
}

module.exports = withStripApsEnvironment;
