import { Platform, Vibration } from "react-native"
import * as Notifications from "expo-notifications"
import { NOTIFICATION_CATEGORIES } from "@/lib/notifications"
import {
  cancelVivosCallV2IncomingNotification,
  displayVivosCallV2IncomingNotification,
} from "@/lib/calls-v2/notifeeCallV2"
import { VivosCallType } from "@/lib/calls-v2/types"

let activeCallSessionId: string | null = null
let ringtoneTimer: ReturnType<typeof setInterval> | null = null
let localNotificationIds: string[] = []

const RING_INTERVAL_MS = 4200
const VIBRATION_PATTERN = [0, 900, 350, 900, 700]

type StartRingtoneArgs = {
  callSessionId?: string | null
  callerName?: string | null
  callType?: VivosCallType
  conversationId?: string | null
  fromUserId?: string | null
}

async function fireRingNotification(args: StartRingtoneArgs) {
  if (Platform.OS === "android") {
    await displayVivosCallV2IncomingNotification(args)
    return
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "VIVOS Messenger",
        body: `${args.callerName?.trim() || "Un membru VIVOS"} te sună ${
          args.callType === "video" ? "video" : "audio"
        }`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: NOTIFICATION_CATEGORIES.incomingCall,
        data: {
          kind: "incoming_call_v2",
          type: "call_v2",
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
    console.warn("V2 call ringtone notification failed", error)
  }
}

export async function startVivosCallV2Ringtone(args: StartRingtoneArgs = {}) {
  const callSessionId = args.callSessionId ?? "unknown-call-v2"

  if (activeCallSessionId === callSessionId && ringtoneTimer) return

  await stopVivosCallV2Ringtone()
  activeCallSessionId = callSessionId

  try {
    Vibration.vibrate(VIBRATION_PATTERN, true)
  } catch (error) {
    console.warn("V2 call ringtone vibration failed", error)
  }

  await fireRingNotification(args)

  ringtoneTimer = setInterval(() => {
    if (!activeCallSessionId) return
    void fireRingNotification(args)
  }, RING_INTERVAL_MS)
}

export async function stopVivosCallV2Ringtone(callSessionId?: string | null) {
  if (callSessionId && activeCallSessionId && activeCallSessionId !== callSessionId) return

  activeCallSessionId = null

  if (ringtoneTimer) {
    clearInterval(ringtoneTimer)
    ringtoneTimer = null
  }

  try {
    Vibration.cancel()
  } catch (error) {
    console.warn("V2 call ringtone vibration cancel failed", error)
  }

  await cancelVivosCallV2IncomingNotification()

  const ids = [...localNotificationIds]
  localNotificationIds = []

  await Promise.all(ids.map((id) => Notifications.dismissNotificationAsync(id).catch(() => {})))
}
