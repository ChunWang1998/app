const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const app2Root = path.resolve(projectRoot, '..');
const sharedRoot = path.resolve(app2Root, 'shared');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Shared places loader + optional assets under app2/
config.watchFolders = [app2Root];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@shared': sharedRoot,
};
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  ...((config.resolver.nodeModulesPaths) || []),
];

module.exports = config;
