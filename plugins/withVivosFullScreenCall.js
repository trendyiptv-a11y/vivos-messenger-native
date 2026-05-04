const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins")

function ensurePermission(manifest, permissionName) {
  manifest.manifest["uses-permission"] = manifest.manifest["uses-permission"] || []
  const permissions = manifest.manifest["uses-permission"]
  const exists = permissions.some((item) => item?.$?.["android:name"] === permissionName)
  if (!exists) {
    permissions.push({ $: { "android:name": permissionName } })
  }
}

function withVivosFullScreenCall(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults
    ensurePermission(manifest, "android.permission.USE_FULL_SCREEN_INTENT")
    ensurePermission(manifest, "android.permission.WAKE_LOCK")

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest)
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(mainApplication)
    mainActivity.$["android:showWhenLocked"] = "true"
    mainActivity.$["android:turnScreenOn"] = "true"
    mainActivity.$["android:excludeFromRecents"] = "false"

    return config
  })
}

module.exports = withVivosFullScreenCall
