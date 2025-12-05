// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure resolver to handle react-native-maps on web
config.resolver = {
  ...config.resolver,
  blockList: [
    // Block react-native-maps native components on web
    /node_modules\/react-native-maps\/lib\/.*NativeComponent\.js$/,
    /node_modules\/react-native-maps\/lib\/.*NativeComponent\.ts$/,
  ],
  resolveRequest: (context, moduleName, platform) => {
    // Redirect react-native-maps to web mock on web platform
    if (platform === 'web' && moduleName === 'react-native-maps') {
      const mockPath = path.resolve(__dirname, 'web-mocks/react-native-maps.ts');
      return {
        filePath: mockPath,
        type: 'sourceFile',
      };
    }
    
    // Block native component imports on web
    if (platform === 'web' && moduleName.includes('react-native-maps') && moduleName.includes('NativeComponent')) {
      return {
        type: 'empty',
      };
    }
    
    // Use default resolver for all other cases
    if (context.resolveRequest) {
      return context.resolveRequest(context, moduleName, platform);
    }
    return context.defaultResolver(context, moduleName, platform);
  },
};

module.exports = config;

