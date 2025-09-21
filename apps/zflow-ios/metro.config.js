const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
const resolveFromProject = (moduleName) =>
  path.dirname(require.resolve(`${moduleName}/package.json`, { paths: [projectRoot] }));

const reactPath = resolveFromProject('react');
const reactNativePath = resolveFromProject('react-native');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: reactPath,
  'react/jsx-runtime': path.join(reactPath, 'jsx-runtime'),
  'react/jsx-dev-runtime': path.join(reactPath, 'jsx-dev-runtime'),
  'react-native': reactNativePath,
};

module.exports = config;
