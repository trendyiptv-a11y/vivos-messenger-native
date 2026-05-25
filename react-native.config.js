const isIosBuild = process.env.EAS_BUILD_PLATFORM === "ios" || process.env.EXPO_OS === "ios"

if (!isIosBuild) {
  module.exports = {}
} else {
  module.exports = {
    dependencies: {
      "@react-native-firebase/app": {
        platforms: {
          ios: null,
        },
      },
      "@react-native-firebase/messaging": {
        platforms: {
          ios: null,
        },
      },
    },
  }
}
