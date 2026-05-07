import notifee, {
  AndroidCategory,
  AndroidColor,
  AndroidImportance,
  AndroidLaunchActivityFlag,
  AndroidVisibility,
  EventType,
} from "@notifee/react-native"
import { Platform, Vibration } from "react-native"
import { NOTIFICATION_ACTIONS, NOTIFICATION_CHANNELS } from "@/lib/notifications"
import { setIncomingCallState } from "@/lib/calls/callState"
import { IncomingCall } from "@/types/call"

const CALL_NOTIFICATION_ID = "vivos-incoming-call"
const RING_VIBRATION_PATTERN = [900, 450, 900, 700]

type IncomingCallNotificationArgs = {
  conversationId?: string | null
  callSessionId?: string | null
  fromUserId?: string | null
  callerName?: string | null
  callType?: "audio" | "video"
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeCallData(data: Record<string, unknown> | undefined): IncomingCall | null {
  const conversationId = asString(data?.conversationId)
  const callSessionId = asString(data?.callSessionId)
  const fromUserId = asString(data?.fromUserId) || asString(data?.callerUserId)

  if (!conversationId || !callSessionId || !fromUserId) return null

  return {
    conversationId,
    callSessionId,
    fromUserId,
    callType: data?.callType === "video" ? "video" : "audio",
  }
}

export async function setupNotifeeCallChannel() {
  if (Platform.OS !== "android") return null

  return notifee.createChannel({
    id: NOTIFICATION_CHANNELS.calls,
    name: "VIVOS Messages",
    importance: AndroidImportance.MAX,
    sound: "default",
    vibration: true,
    vibrationPattern: RING_VIBRATION_PATTERN,
    lights: true,
    lightColor: AndroidColor.MAGENTA,
    bypassDnd: false,
  })
}

export async function displayNotifeeIncomingCall(args: IncomingCallNotificationArgs) {
  if (Platform.OS !== "android") return

  const conversationId = args.conversationId ?? ""
  const callSessionId = args.callSessionId ?? ""
  const fromUserId = args.fromUserId ?? ""
  const callType = args.callType ?? "audio"
  const callerName = args.callerName?.trim() || "Un membru VIVOS"

  await setupNotifeeCallChannel()

  try {
    Vibration.vibrate([0, ...RING_VIBRATION_PATTERN], true)
  } catch {}

  await notifee.displayNotification({
    id: CALL_NOTIFICATION_ID,
    title: "VIVOS Messenger",
    body: `${callerName} te sună ${callType === "video" ? "video" : "audio"}`,
    data: {
      kind: "incoming_call",
      type: "call",
      conversationId,
      callSessionId,
      fromUserId,
      callerUserId: fromUserId,
      callType,
    },
    android: {
      channelId: NOTIFICATION_CHANNELS.calls,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.MAX,
      visibility: AndroidVisibility.PUBLIC,
      color: "#C96AA1",
      colorized: true,
      ongoing: true,
      autoCancel: false,
      pressAction: {
        id: "default",
        launchActivity: "default",
      },
      fullScreenAction: {
        id: "default",
        launchActivity: "default",
        launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
      },
      actions: [
        {
          title: "Respinge",
          pressAction: {
            id: NOTIFICATION_ACTIONS.rejectCall,
            launchActivity: "default",
          },
        },
        {
          title: "Acceptă",
          pressAction: {
            id: NOTIFICATION_ACTIONS.acceptCall,
            launchActivity: "default",
          },
        },
      ],
      timestamp: Date.now(),
      showTimestamp: true,
      loopSound: true,
      sound: "default",
      vibrationPattern: RING_VIBRATION_PATTERN,
    },
  })
}

export async function cancelNotifeeIncomingCall() {
  try {
    Vibration.cancel()
  } catch {}

  if (Platform.OS !== "android") return
  await notifee.cancelNotification(CALL_NOTIFICATION_ID).catch(() => {})
}

export function registerNotifeeCallEvents(onOpenConversation?: (conversationId: string) => void) {
  if (Platform.OS !== "android") return () => {}

  const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
    if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) return

    const data = detail.notification?.data as Record<string, unknown> | undefined
    const call = normalizeCallData(data)
    if (!call) return

    await cancelNotifeeIncomingCall()

    const action =
      detail.pressAction?.id === NOTIFICATION_ACTIONS.acceptCall
        ? "accept"
        : detail.pressAction?.id === NOTIFICATION_ACTIONS.rejectCall
          ? "reject"
          : "open"

    setIncomingCallState(call, action)
    onOpenConversation?.(call.conversationId)
  })

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) return

    const data = detail.notification?.data as Record<string, unknown> | undefined
    const call = normalizeCallData(data)
    if (!call) return

    await cancelNotifeeIncomingCall()

    const action =
      detail.pressAction?.id === NOTIFICATION_ACTIONS.acceptCall
        ? "accept"
        : detail.pressAction?.id === NOTIFICATION_ACTIONS.rejectCall
          ? "reject"
          : "open"

    setIncomingCallState(call, action)
  })

  return unsubscribeForeground
}
