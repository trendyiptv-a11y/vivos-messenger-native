import { Platform, Vibration } from "react-native"
import * as Notifications from "expo-notifications"
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS } from "@/lib/notifications"
import { cancelNotifeeIncomingCall, displayNotifeeIncomingCall } from "@/lib/calls/notifeeCall"

let activeCallSessionId: string | null = null
let ringtoneTimer: ReturnType<typeof setInterval> | null = null
let localNotificationIds: string[] = []

const RING_INTERVAL_MS = 4200
const VIBRATION_PATTERN = [0, 900, 350, 900, 700]

type StartRingtoneArgs = {
  callSessionId?: string | null
  callerName?: string | null
  callType?: "audio" | "video"
  conversationId?: string | null
  fromUserId?: string | null
}

async function fireRingNotification(args: StartRingtoneArgs) {
  if (Platform.OS === "android") {
    await displayNotifeeIncomingCall(args)
    return
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "VIVOS Messenger",
        body: `${args.callerName?.trim() || "Un membru VIVOS"} te sună ${args.callType === "video" ? "video" : "audio"}`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: NOTIFICATION_CATEGORIES.incomingCall,
        data: {
          kind: "incoming_call",
          type: "call",
          conversationId: args.conversationId ?? null,
          callSessionId: args.callSessionId ?? null,
          fromUserId: args.fromUserId ?? null,
          callerUserId: args.fromUserId ?? null,
          callType: args.callType ?? "audio",
          localRingtone: true,
        },
      },
      trigger: { seconds: 1 },
    })

    localNotificationIds.push(id)
    if (localNotificationIds.length > 8) {
      const oldIds = localNotificationIds.splice(0, localNotificationIds.length - 8)
      oldIds.forEach((oldId) => {
        Notifications.dismissNotificationAsync(oldId).catch(() => {})
      })
    }
  } catch (error) {
    console.warn("Call ringtone notification failed", error)
  }
}

export async function startCallRingtone(args: StartRingtoneArgs = {}) {
  const callSessionId = args.callSessionId ?? "unknown-call"

  if (activeCallSessionId === callSessionId && ringtoneTimer) return

  await stopCallRingtone()
  activeCallSessionId = callSessionId

  try {
    Vibration.vibrate(VIBRATION_PATTERN, true)
  } catch (error) {
    console.warn("Call ringtone vibration failed", error)
  }

  await fireRingNotification(args)

  ringtoneTimer = setInterval(() => {
    if (!activeCallSessionId) return
    void fireRingNotification(args)
  }, RING_INTERVAL_MS)
}

export async function stopCallRingtone() {
  activeCallSessionId = null

  if (ringtoneTimer) {
    clearInterval(ringtoneTimer)
    ringtoneTimer = null
  }

  try {
    Vibration.cancel()
  } catch (error) {
    console.warn("Call ringtone vibration cancel failed", error)
  }

  await cancelNotifeeIncomingCall()

  const ids = [...localNotificationIds]
  localNotificationIds = []

  await Promise.all(ids.map((id) => Notifications.dismissNotificationAsync(id).catch(() => {})))
}
