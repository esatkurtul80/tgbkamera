const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Set EXPO_ROUTER_APP_ROOT explicitly for monorepo support
process.env.EXPO_ROUTER_APP_ROOT = path.resolve(projectRoot, 'src/app');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...config.watchFolders, workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Firebase 10 uses CJS builds that Metro must not skip
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

// Force Babel to transpile Firebase packages (private class fields → Hermes-safe)
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native|expo|@expo|expo-router|firebase|@firebase|react-native-reanimated|@react-navigation)/)',
];

// Enable Hermes engine compatibility
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
