import { Platform } from "react-native"
import * as Notifications from "expo-notifications"
import Constants from "expo-constants"
import { supabase } from "@/lib/supabase"
import { t } from "@/lib/i18n"

export const NOTIFICATION_CHANNELS = {
  messages: "vivos-messages",
  calls: "vivos-calls",
}

export const NOTIFICATION_CATEGORIES = {
  incomingCall: "vivos-incoming-call",
}

export const NOTIFICATION_ACTIONS = {
  acceptCall: "vivos-accept-call",
  rejectCall: "vivos-reject-call",
}

type PushRegistrationResult = {
  ok: boolean
  token: string | null
  projectId: string | null
  permissionGranted: boolean
  stage: "permission" | "project" | "token" | "save" | "done"
  error?: string
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function configureNotificationCategories() {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.incomingCall, [
    {
      identifier: NOTIFICATION_ACTIONS.acceptCall,
      buttonTitle: "Acceptă",
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: NOTIFICATION_ACTIONS.rejectCall,
      buttonTitle: "Respinge",
      options: {
        opensAppToForeground: true,
        isDestructive: true,
      },
    },
  ])
}

export async function configureAndroidNotificationChannels() {
  if (Platform.OS !== "android") return

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.messages, {
    name: "VIVOS Messages",
    description: "Notificări scurte pentru mesajele VIVOS.",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#63A6E6",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  })

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.calls, {
    name: "VIVOS Calls",
    description: "Apeluri VIVOS cu sunet și vibrație de apel.",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 900, 400, 900, 400, 900],
    lightColor: "#22C55E",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  })
}

export async function configureNativeNotifications() {
  await configureAndroidNotificationChannels()
  await configureNotificationCategories()
}

export async function requestNotificationPermissions() {
  await configureNativeNotifications()

  const settings = await Notifications.getPermissionsAsync()
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return settings
  }
  return Notifications.requestPermissionsAsync()
}

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || null
}

export async function registerPushTokenDetailed(userId?: string | null): Promise<PushRegistrationResult> {
  let token: string | null = null
  const projectId = getProjectId()

  try {
    const permissions = await requestNotificationPermissions()
    const permissionGranted = Boolean(
      permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    )

    if (!permissionGranted) {
      return {
        ok: false,
        token: null,
        projectId,
        permissionGranted: false,
        stage: "permission",
        error: "Permisiunea pentru notificări nu este acordată.",
      }
    }

    if (!projectId) {
      return {
        ok: false,
        token: null,
        projectId: null,
        permissionGranted: true,
        stage: "project",
        error: "Lipsește EAS projectId în build.",
      }
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId })
    token = tokenResult.data

    if (!token) {
      return {
        ok: false,
        token: null,
        projectId,
        permissionGranted: true,
        stage: "token",
        error: "Expo nu a returnat push token.",
      }
    }

    if (!userId) {
      return {
        ok: false,
        token,
        projectId,
        permissionGranted: true,
        stage: "save",
        error: "User ID lipsă; tokenul nu poate fi salvat.",
      }
    }

    await supabase.from("device_push_tokens").delete().eq("user_id", userId)

    const { error: insertError } = await supabase.from("device_push_tokens").insert({
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    })

    if (insertError) {
      const { error: upsertError } = await supabase.from("device_push_tokens").upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token" }
      )

      if (upsertError) {
        return {
          ok: false,
          token,
          projectId,
          permissionGranted: true,
          stage: "save",
          error: upsertError.message || insertError.message,
        }
      }
    }

    return {
      ok: true,
      token,
      projectId,
      permissionGranted: true,
      stage: "done",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn("Push token registration failed", error)
    return {
      ok: false,
      token,
      projectId,
      permissionGranted: false,
      stage: token ? "save" : "token",
      error: message,
    }
  }
}

export async function registerPushToken(userId?: string | null) {
  const result = await registerPushTokenDetailed(userId)
  return result.ok ? result.token : null
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
      categoryIdentifier: NOTIFICATION_CATEGORIES.incomingCall,
      data: { kind: "incoming_call", callType },
    },
    trigger: Platform.OS === "android" ? { channelId: NOTIFICATION_CHANNELS.calls, seconds: 1 } : { seconds: 1 },
  })
}
