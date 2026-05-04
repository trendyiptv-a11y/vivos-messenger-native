import { Platform } from "react-native"
import notifee, {
  AndroidCategory,
  AndroidColor,
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from "@notifee/react-native"
import { NOTIFICATION_CHANNELS } from "@/lib/notifications"
import { setIncomingCallState } from "@/lib/calls/callState"
import { IncomingCall } from "@/types/call"

export const NATIVE_CALL_ACTIONS = {
  accept: "vivos-call-accept",
  reject: "vivos-call-reject",
}

type NativeIncomingCallArgs = {
  callerName: string
  call: IncomingCall
}

export async function configureNativeCallChannel() {
  if (Platform.OS !== "android") return null

  return notifee.createChannel({
    id: NOTIFICATION_CHANNELS.calls,
    name: "VIVOS Calls",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
    vibrationPattern: [900, 400, 900, 400, 900],
    lights: true,
    lightColor: AndroidColor.RED,
    visibility: AndroidVisibility.PUBLIC,
  })
}

export async function displayNativeIncomingCall({ callerName, call }: NativeIncomingCallArgs) {
  if (Platform.OS !== "android") return

  await configureNativeCallChannel()

  await notifee.displayNotification({
    id: `vivos-call-${call.callSessionId}`,
    title: "VIVOS Messenger",
    body: `${callerName || "Cineva"} te sună ${call.callType === "video" ? "video" : "audio"}`,
    data: {
      kind: "incoming_call",
      conversationId: call.conversationId,
      callSessionId: call.callSessionId,
      fromUserId: call.fromUserId,
      callType: call.callType,
    },
    android: {
      channelId: NOTIFICATION_CHANNELS.calls,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: "default",
      vibrationPattern: [900, 400, 900, 400, 900],
      ongoing: true,
      autoCancel: false,
      pressAction: {
        id: "default",
        launchActivity: "default",
      },
      fullScreenAction: {
        id: "default",
        launchActivity: "default",
      },
      actions: [
        {
          title: "Acceptă",
          pressAction: {
            id: NATIVE_CALL_ACTIONS.accept,
            launchActivity: "default",
          },
        },
        {
          title: "Respinge",
          pressAction: {
            id: NATIVE_CALL_ACTIONS.reject,
            launchActivity: "default",
          },
        },
      ],
    },
  })
}

export async function cancelNativeIncomingCall(callSessionId?: string | null) {
  if (!callSessionId) return
  await notifee.cancelNotification(`vivos-call-${callSessionId}`)
}

export function registerNotifeeForegroundHandler() {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) return

    const data = detail.notification?.data ?? {}
    const conversationId = typeof data.conversationId === "string" ? data.conversationId : null
    const callSessionId = typeof data.callSessionId === "string" ? data.callSessionId : null
    const fromUserId = typeof data.fromUserId === "string" ? data.fromUserId : null

    if (!conversationId || !callSessionId || !fromUserId) return

    const action =
      detail.pressAction?.id === NATIVE_CALL_ACTIONS.accept
        ? "accept"
        : detail.pressAction?.id === NATIVE_CALL_ACTIONS.reject
          ? "reject"
          : "open"

    setIncomingCallState(
      {
        conversationId,
        callSessionId,
        fromUserId,
        callType: data.callType === "video" ? "video" : "audio",
      },
      action
    )
  })
}

export function registerNotifeeBackgroundHandler() {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) return

    const data = detail.notification?.data ?? {}
    const conversationId = typeof data.conversationId === "string" ? data.conversationId : null
    const callSessionId = typeof data.callSessionId === "string" ? data.callSessionId : null
    const fromUserId = typeof data.fromUserId === "string" ? data.fromUserId : null

    if (!conversationId || !callSessionId || !fromUserId) return

    const action =
      detail.pressAction?.id === NATIVE_CALL_ACTIONS.accept
        ? "accept"
        : detail.pressAction?.id === NATIVE_CALL_ACTIONS.reject
          ? "reject"
          : "open"

    setIncomingCallState(
      {
        conversationId,
        callSessionId,
        fromUserId,
        callType: data.callType === "video" ? "video" : "audio",
      },
      action
    )

    if (detail.notification?.id) await notifee.cancelNotification(detail.notification.id)
  })
}
