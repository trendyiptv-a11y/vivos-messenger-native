import notifee, {
  AndroidCategory,
  AndroidColor,
  AndroidImportance,
  AndroidLaunchActivityFlag,
  AndroidVisibility,
  EventType,
} from "@notifee/react-native"
import { Platform, Vibration } from "react-native"
import InCallManager from "react-native-incall-manager"
import { NOTIFICATION_ACTIONS, NOTIFICATION_CHANNELS } from "@/lib/notifications"
import { setPendingVivosCallFromNotification } from "@/lib/calls-v2/callNotificationState"
import { savePendingCallNotificationRoute } from "@/lib/calls-v2/callNotificationRoute"
import { shouldBlockIncomingVivosCall } from "@/lib/calls-v2/activeCallRuntime"
import { VivosCallType } from "@/lib/calls-v2/types"

const CALL_NOTIFICATION_ID = "vivos-incoming-call-v2"
const RING_VIBRATION_PATTERN = [900, 450, 900, 700]

type IncomingCallV2NotificationArgs = {
  conversationId?: string | null
  callSessionId?: string | null
  fromUserId?: string | null
  callerName?: string | null
  callType?: VivosCallType
}

type NotificationCallAction = "accept" | "reject" | "open"

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeCallData(data: Record<string, unknown> | undefined) {
  const conversationId = asString(data?.conversationId)
  const callSessionId = asString(data?.callSessionId)
  const fromUserId = asString(data?.fromUserId) || asString(data?.callerUserId)

  if (!conversationId || !callSessionId || !fromUserId) return null

  return {
    conversationId,
    callSessionId,
    fromUserId,
    callType: data?.callType === "video" ? "video" : "audio" as VivosCallType,
  }
}

function shouldIgnoreNotificationCall(call: ReturnType<typeof normalizeCallData>) {
  if (!call) return true

  return shouldBlockIncomingVivosCall({
    conversationId: call.conversationId,
    callSessionId: call.callSessionId,
  })
}

function getNotificationAction(pressActionId?: string | null): NotificationCallAction {
  if (pressActionId === NOTIFICATION_ACTIONS.acceptCall) return "accept"
  if (pressActionId === NOTIFICATION_ACTIONS.rejectCall) return "reject"
  return "open"
}

async function storeNotificationCallAction(
  call: NonNullable<ReturnType<typeof normalizeCallData>>,
  action: NotificationCallAction
) {
  setPendingVivosCallFromNotification(call, action)
  await savePendingCallNotificationRoute({ ...call, action })
}

export async function setupVivosCallV2NotificationChannel() {
  if (Platform.OS !== "android") return null

  return notifee.createChannel({
    id: NOTIFICATION_CHANNELS.calls,
    name: "VIVOS Calls",
    importance: AndroidImportance.MAX,
    sound: "default",
    vibration: true,
    vibrationPattern: RING_VIBRATION_PATTERN,
    lights: true,
    lightColor: AndroidColor.MAGENTA,
    bypassDnd: false,
  })
}

export async function displayVivosCallV2IncomingNotification(args: IncomingCallV2NotificationArgs) {
  if (Platform.OS !== "android") return

  const conversationId = args.conversationId ?? ""
  const callSessionId = args.callSessionId ?? ""
  const fromUserId = args.fromUserId ?? ""
  const callType = args.callType ?? "audio"
  const callerName = args.callerName?.trim() || "Un membru VIVOS"

  if (
    shouldBlockIncomingVivosCall({
      conversationId,
      callSessionId,
    })
  ) {
    await cancelVivosCallV2IncomingNotification()
    return
  }

  await setupVivosCallV2NotificationChannel()

  try {
    InCallManager.startRingtone("_DEFAULT_")
  } catch {
    // ignore
  }

  try {
    Vibration.vibrate([0, ...RING_VIBRATION_PATTERN], true)
  } catch {
    // ignore
  }

  await notifee.displayNotification({
    id: CALL_NOTIFICATION_ID,
    title: "VIVOS Messenger",
    body: `${callerName} te sună ${callType === "video" ? "video" : "audio"}`,
    data: {
      kind: "incoming_call_v2",
      type: "call_v2",
      conversationId,
      callSessionId,
      fromUserId,
      callerUserId: fromUserId,
      callerName,
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

export async function cancelVivosCallV2IncomingNotification() {
  try {
    InCallManager.stopRingtone()
  } catch {
    // ignore
  }

  try {
    Vibration.cancel()
  } catch {
    // ignore
  }

  if (Platform.OS !== "android") return
  await notifee.cancelNotification(CALL_NOTIFICATION_ID).catch(() => {})
}

export function registerVivosCallV2NotifeeEvents(onOpenConversation?: (conversationId: string) => void) {
  if (Platform.OS !== "android") return () => {}

  const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
    if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) return

    const data = detail.notification?.data as Record<string, unknown> | undefined
    const call = normalizeCallData(data)
    if (!call) return

    await cancelVivosCallV2IncomingNotification()

    if (shouldIgnoreNotificationCall(call)) return

    const action = getNotificationAction(detail.pressAction?.id)

    await storeNotificationCallAction(call, action)

    if (action !== "reject") {
      onOpenConversation?.(call.conversationId)
    }
  })

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) return

    const data = detail.notification?.data as Record<string, unknown> | undefined
    const call = normalizeCallData(data)
    if (!call) return

    await cancelVivosCallV2IncomingNotification()

    if (shouldIgnoreNotificationCall(call)) return

    const action = getNotificationAction(detail.pressAction?.id)
    await storeNotificationCallAction(call, action)
  })

  return unsubscribeForeground
}

export function registerVivosCallV2NotifeeBackgroundHandler() {
  if (Platform.OS !== "android") return

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) return

    const data = detail.notification?.data as Record<string, unknown> | undefined
    const call = normalizeCallData(data)
    if (!call) return

    await cancelVivosCallV2IncomingNotification()

    if (shouldIgnoreNotificationCall(call)) return

    const action = getNotificationAction(detail.pressAction?.id)
    await storeNotificationCallAction(call, action)
  })
}
