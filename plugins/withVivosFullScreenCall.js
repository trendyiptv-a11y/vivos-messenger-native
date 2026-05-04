const { withAndroidManifest } = require("@expo/config-plugins")

function ensurePermission(manifest, permissionName) {
  manifest.manifest["uses-permission"] = manifest.manifest["uses-permission"] || []
  const permissions = manifest.manifest["uses-permission"]
  const exists = permissions.some((item) => item?.$?.["android:name"] === permissionName)
  if (!exists) permissions.push({ $: { "android:name": permissionName } })
}

function getMainApplication(manifest) {
  const applications = manifest.manifest.application || []
  return applications[0] || null
}

function isMainActivity(activity) {
  const intentFilters = activity?.["intent-filter"] || []
  return intentFilters.some((filter) => {
    const actions = filter.action || []
    const categories = filter.category || []
    const hasMain = actions.some((action) => action?.$?.["android:name"] === "android.intent.action.MAIN")
    const hasLauncher = categories.some((category) => category?.$?.["android:name"] === "android.intent.category.LAUNCHER")
    return hasMain && hasLauncher
  })
}

function getMainActivity(application) {
  const activities = application.activity || []
  return activities.find(isMainActivity) || activities[0] || null
}

function withVivosFullScreenCall(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults
    ensurePermission(manifest, "android.permission.USE_FULL_SCREEN_INTENT")
    ensurePermission(manifest, "android.permission.WAKE_LOCK")

    const mainApplication = getMainApplication(manifest)
    const mainActivity = mainApplication ? getMainActivity(mainApplication) : null

    if (mainActivity?.$) {
      mainActivity.$["android:showWhenLocked"] = "true"
      mainActivity.$["android:turnScreenOn"] = "true"
      mainActivity.$["android:excludeFromRecents"] = "false"
    }

    return config
  })
}

module.exports = withVivosFullScreenCall
