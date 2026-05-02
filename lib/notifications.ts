import * as Notifications from "expo-notifications"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function requestNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync()
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return settings
  }
  return Notifications.requestPermissionsAsync()
}

export async function clearNativeBadge() {
  try {
    await Notifications.setBadgeCountAsync(0)
  } catch (error) {
    console.warn("Badge clear failed", error)
  }
}
