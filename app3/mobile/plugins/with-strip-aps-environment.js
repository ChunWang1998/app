const { withEntitlementsPlist, withBaseMod } = require('expo/config-plugins');

/**
 * expo-notifications adds aps-environment (remote push). Been Ages only
 * schedules local notifications, so strip that entitlement.
 *
 * withEntitlementsPlist actions run before later plugins in the same chain,
 * so also wrap the entitlements mod and delete again after nextMod.
 */
function stripAps(results) {
  if (results?.modResults) delete results.modResults['aps-environment'];
  if (results?.ios?.entitlements) delete results.ios.entitlements['aps-environment'];
  return results;
}

function withStripApsEnvironment(config) {
  if (config.ios?.entitlements) {
    delete config.ios.entitlements['aps-environment'];
  }
  config = withEntitlementsPlist(config, (mod) => stripAps(mod));
  return withBaseMod(config, {
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
}

module.exports = withStripApsEnvironment;
