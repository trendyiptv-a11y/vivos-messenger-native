const appJson = require("./app.json")

const firebasePlugins = new Set([
  "@react-native-firebase/app",
  "@react-native-firebase/messaging",
])

module.exports = ({ config }) => {
  const baseConfig = {
    ...config,
    ...appJson.expo,
  }

  const platform = process.env.EAS_BUILD_PLATFORM || process.env.EXPO_OS || ""
  const isIosBuild = platform === "ios"

  if (!isIosBuild) {
    return baseConfig
  }

  return {
    ...baseConfig,
    plugins: (baseConfig.plugins || []).filter((plugin) => {
      const pluginName = Array.isArray(plugin) ? plugin[0] : plugin
      return !firebasePlugins.has(pluginName)
    }),
  }
}
