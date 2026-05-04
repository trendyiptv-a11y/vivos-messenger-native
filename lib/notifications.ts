import { Platform } from "react-native"
import * as Notifications from "expo-notifications"
import Constants from "expo-constants"
import { supabase } from "@/lib/supabase"
import { t } from "@/lib/i18n"

export const NOTIFICATION_CHANNELS = {
  messages: "vivos-messages",
  calls: "vivos-calls",
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function configureAndroidNotificationChannels() {
  if (Platform.OS !== "android") return

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.messages, {
    name: "VIVOS Messages",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#63A6E6",
    sound: "default",
  })

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.calls, {
    name: "VIVOS Calls",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 900, 400, 900, 400, 900],
    lightColor: "#C96AA1",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  })
}

export async function requestNotificationPermissions() {
  await configureAndroidNotificationChannels()

  const settings = await Notifications.getPermissionsAsync()
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return settings
  }
  return Notifications.requestPermissionsAsync()
}

export async function registerPushToken(userId?: string | null) {
  try {
    const permissions = await requestNotificationPermissions()
    if (!permissions.granted && permissions.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return null
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId
    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync()

    const token = tokenResult.data

    if (userId) {
      await supabase.from("device_push_tokens").upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token" }
      )
    }

    return token
  } catch (error) {
    console.warn("Push token registration failed", error)
    return null
  }
}

export async function clearNativeBadge() {
  try {
    await Notifications.setBadgeCountAsync(0)
  } catch (error) {
    console.warn("Badge clear failed", error)
  }
}

export async function showLocalMessageNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || t("messageNotificationTitle"),
      body,
      sound: "default",
      badge: 1,
    },
    trigger: Platform.OS === "android" ? { channelId: NOTIFICATION_CHANNELS.messages, seconds: 1 } : { seconds: 1 },
  })
}

export async function showLocalIncomingCallNotification(callerName: string, callType: "audio" | "video") {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t("callNotificationTitle"),
      body: `${callerName} ${t("callNotificationBody")}`,
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
      badge: 1,
      data: { kind: "incoming_call", callType },
    },
    trigger: Platform.OS === "android" ? { channelId: NOTIFICATION_CHANNELS.calls, seconds: 1 } : { seconds: 1 },
  })
}
