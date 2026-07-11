import notifee, {
  AndroidCategory,
  AndroidColor,
  AndroidImportance,
  AndroidVisibility,
} from "@notifee/react-native"
import { Platform } from "react-native"
import { NOTIFICATION_CHANNELS } from "@/lib/notifications"
import { VivosCallType } from "@/lib/calls-v2/types"

const ACTIVE_CALL_NOTIFICATION_ID = "vivos-active-call-foreground-service"
let foregroundServiceRegistered = false
let foregroundServiceActive = false

export function registerVivosCallForegroundService() {
  if (Platform.OS !== "android") return
  if (foregroundServiceRegistered) return

  foregroundServiceRegistered = true

  notifee.registerForegroundService(() => {
    return new Promise(() => {
      // Keeps the Android foreground service alive while a VIVOS call is active.
      // The service is stopped explicitly by stopVivosCallForegroundService().
    })
  })
}

async function ensureCallChannel() {
  if (Platform.OS !== "android") return null

  return notifee.createChannel({
    id: NOTIFICATION_CHANNELS.calls,
    name: "VIVOS Calls",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
    lights: true,
    lightColor: AndroidColor.MAGENTA,
  })
}

export async function startVivosCallForegroundService(callType: VivosCallType) {
  if (Platform.OS !== "android") return

  try {
    registerVivosCallForegroundService()
    await ensureCallChannel()

    await notifee.displayNotification({
      id: ACTIVE_CALL_NOTIFICATION_ID,
      title: "VIVOS Messenger",
      body: callType === "video" ? "Apel video VIVOS în desfășurare" : "Apel audio VIVOS în desfășurare",
      android: {
        channelId: NOTIFICATION_CHANNELS.calls,
        asForegroundService: true,
        category: AndroidCategory.CALL,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        ongoing: true,
        autoCancel: false,
        color: "#C96AA1",
        colorized: true,
        pressAction: {
          id: "default",
          launchActivity: "default",
        },
      },
    })

    foregroundServiceActive = true
  } catch (error) {
    console.warn("VIVOS call foreground service start failed", error)
  }
}

export async function stopVivosCallForegroundService() {
  if (Platform.OS !== "android") return

  try {
    if (foregroundServiceActive) {
      await notifee.stopForegroundService()
    }
  } catch (error) {
    console.warn("VIVOS call foreground service stop failed", error)
  }

  try {
    await notifee.cancelNotification(ACTIVE_CALL_NOTIFICATION_ID)
  } catch {
    // ignore
  }

  foregroundServiceActive = false
}
