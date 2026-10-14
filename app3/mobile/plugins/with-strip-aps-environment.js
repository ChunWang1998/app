const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * expo-notifications adds aps-environment (remote push). Been Ages only
 * schedules local notifications, so strip that entitlement after the
 * notifications plugin runs.
 */
function withStripApsEnvironment(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
}

module.exports = withStripApsEnvironment;
