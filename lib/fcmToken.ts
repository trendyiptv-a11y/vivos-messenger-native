import { Platform } from "react-native"
import messaging from "@react-native-firebase/messaging"
import { supabase } from "@/lib/supabase"

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

export async function registerFcmToken() {
  if (Platform.OS !== "android") {
    return { ok: false, reason: "not-android" }
  }

  try {
    const accessToken = await getAccessToken()

    if (!accessToken) {
      console.warn("FCM token skipped: missing access token")
      return { ok: false, reason: "missing-access-token" }
    }

    await messaging().registerDeviceForRemoteMessages()

    const token = await messaging().getToken()

    if (!token) {
      console.warn("FCM token skipped: empty token")
      return { ok: false, reason: "empty-token" }
    }

    const response = await fetch("https://vivos-api.vercel.app/api/device-fcm-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token,
        platform: "android-fcm",
        deviceLabel: "vivos-messenger-android-fcm",
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.warn("FCM token save failed", response.status, data)
      return {
        ok: false,
        status: response.status,
        data,
      }
    }

    return {
      ok: true,
      token,
      data,
    }
  } catch (error) {
    console.warn("FCM token registration error", error)

    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}
