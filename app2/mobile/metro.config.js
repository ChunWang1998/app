const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const app2Root = path.resolve(projectRoot, '..');
const sharedRoot = path.resolve(app2Root, 'shared');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Shared places loader + optional assets under app2/
config.watchFolders = [app2Root];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  ...((config.resolver.nodeModulesPaths) || []),
];

// Metro treats @shared/places as a scoped package name; rewrite to app2/shared/*
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@shared' || moduleName.startsWith('@shared/')) {
    const sub =
      moduleName === '@shared' ? 'index' : moduleName.slice('@shared/'.length);
    return context.resolveRequest(
      context,
      path.resolve(sharedRoot, sub),
      platform,
    );
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
