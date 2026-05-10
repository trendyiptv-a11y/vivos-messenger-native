import { Platform } from "react-native"
import * as Notifications from "expo-notifications"
import Constants from "expo-constants"
import { supabase } from "@/lib/supabase"
import { t } from "@/lib/i18n"

export const NOTIFICATION_CHANNELS = {
  messages: "vivos-messages-v6",
  calls: "vivos-calls-v4",
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
      buttonTitle: t("acceptCall"),
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: NOTIFICATION_ACTIONS.rejectCall,
      buttonTitle: t("rejectCall"),
      options: {
        opensAppToForeground: true,
        isDestructive: true,
      },
    },
  ])
}

export async function configureAndroidNotificationChannels() {
  if (Platform.OS !== "android") return

  // Doar messages — canalul calls e creat exclusiv de Notifee în setupNotifeeCallChannel
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.messages, {
    name: "VIVOS Messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 140],
    lightColor: "#63A6E6",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
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

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function saveTokenViaApi(token: string) {
  const accessToken = await getAccessToken()
  if (!accessToken) return new Error("Lipsește sesiunea pentru salvarea tokenului.")

  const response = await fetch("https://vivos-api.vercel.app/api/device-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS,
      deviceLabel: `vivos-messenger-${Platform.OS}`,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => "")
    return new Error(`API token save failed: ${response.status} ${details}`)
  }

  return null
}

async function saveTokenDirectly(userId: string, token: string) {
  const payload = {
    user_id: userId,
    token,
    platform: Platform.OS,
    device_label: `vivos-messenger-${Platform.OS}`,
    is_active: true,
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }

  const { error: upsertError } = await supabase.from("device_push_tokens").upsert(payload, {
    onConflict: "token",
  })

  if (!upsertError) return null

  const fallbackPayload = {
    user_id: userId,
    token,
    platform: Platform.OS,
    is_active: true,
    updated_at: new Date().toISOString(),
  }

  const { error: fallbackError } = await supabase.from("device_push_tokens").upsert(fallbackPayload, {
    onConflict: "token",
  })

  return fallbackError || upsertError
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
      return { ok: false, token: null, projectId, permissionGranted: false, stage: "permission", error: "Permisiunea pentru notificări nu este acordată." }
    }

    if (!projectId) {
      return { ok: false, token: null, projectId: null, permissionGranted: true, stage: "project", error: "Lipsește EAS projectId în build." }
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId })
    token = tokenResult.data

    if (!token) {
      return { ok: false, token: null, projectId, permissionGranted: true, stage: "token", error: "Expo nu a returnat push token." }
    }

    if (!userId) {
      return { ok: false, token, projectId, permissionGranted: true, stage: "save", error: "User ID lipsă; tokenul nu poate fi salvat." }
    }

    const apiSaveError = await saveTokenViaApi(token)
    const directSaveError = apiSaveError ? await saveTokenDirectly(userId, token) : null
    const saveError = apiSaveError && directSaveError ? directSaveError : null

    if (saveError) {
      return { ok: false, token, projectId, permissionGranted: true, stage: "save", error: saveError.message }
    }

    return { ok: true, token, projectId, permissionGranted: true, stage: "done" }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn("Push token registration failed", error)
    return { ok: false, token, projectId, permissionGranted: false, stage: token ? "save" : "token", error: message }
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
    trigger: Platform.OS === "android"
      ? { channelId: NOTIFICATION_CHANNELS.messages, seconds: 1 }
      : { seconds: 1 },
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
    trigger: Platform.OS === "android"
      ? { channelId: NOTIFICATION_CHANNELS.calls, seconds: 1 }
      : { seconds: 1 },
  })
}

export async function unregisterPushToken() {
  try {
    const accessToken = await getAccessToken()

    if (!accessToken) {
      return { ok: false, reason: "missing-access-token" }
    }

    const projectId = getProjectId()
    let token: string | null = null

    if (projectId) {
      try {
        const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId })
        token = tokenResult.data ?? null
      } catch (error) {
        console.warn("Could not read Expo push token before unregister", error)
      }
    }

    const response = await fetch("https://vivos-api.vercel.app/api/device-token/unregister", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token,
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.warn("Push token unregister failed", response.status, data)
      return {
        ok: false,
        status: response.status,
        data,
      }
    }

    return {
      ok: true,
      data,
    }
  } catch (error) {
    console.warn("Push token unregister error", error)

    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}
