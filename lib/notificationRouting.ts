import * as Notifications from "expo-notifications"
import { Router } from "expo-router"
import { NOTIFICATION_ACTIONS } from "@/lib/notifications"
import {
  setPendingVivosCallFromNotification,
  VivosCallNotificationAction,
} from "@/lib/calls-v2/callNotificationState"
import {
  startVivosCallV2Ringtone,
  stopVivosCallV2Ringtone,
} from "@/lib/calls-v2/callRingtone"
import { isActiveVivosCallConversation } from "@/lib/calls-v2/activeCallRuntime"
import { setGlobalIncomingVivosCall } from "@/lib/calls-v2/globalIncomingCallState"

type NotificationData = {
  kind?: unknown
  type?: unknown
  conversationId?: unknown
  callSessionId?: unknown
  callType?: unknown
  fromUserId?: unknown
  callerUserId?: unknown
  callerName?: unknown
  title?: unknown
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function getNotificationData(response: Notifications.NotificationResponse): NotificationData {
  return (response.notification.request.content.data ?? {}) as NotificationData
}

function getNotificationAction(response: Notifications.NotificationResponse): VivosCallNotificationAction {
  return response.actionIdentifier === NOTIFICATION_ACTIONS.acceptCall
    ? "accept"
    : response.actionIdentifier === NOTIFICATION_ACTIONS.rejectCall
      ? "reject"
      : "open"
}

export function routeNotificationResponse(router: Router, response: Notifications.NotificationResponse) {
  const data = getNotificationData(response)
  const kind = asString(data.kind) || asString(data.type)
  const conversationId = asString(data.conversationId)

  if (!conversationId) return

  if (kind === "incoming_call_v2" || kind === "call_v2") {
    void stopVivosCallV2Ringtone()

    const callSessionId = asString(data.callSessionId)
    const fromUserId = asString(data.fromUserId) || asString(data.callerUserId)

    if (callSessionId && fromUserId) {
      setPendingVivosCallFromNotification(
        {
          conversationId,
          callSessionId,
          fromUserId,
          callType: data.callType === "video" ? "video" : "audio",
        },
        getNotificationAction(response)
      )
    }

    router.push({ pathname: "/chat/[id]", params: { id: conversationId } })
    return
  }

  router.push({ pathname: "/chat/[id]", params: { id: conversationId } })
}

export async function routeInitialNotificationResponse(router: Router) {
  const lastResponse = await Notifications.getLastNotificationResponseAsync()
  if (lastResponse) routeNotificationResponse(router, lastResponse)
}

export function routeForegroundNotification(notification: Notifications.Notification) {
  const data = (notification.request.content.data ?? {}) as NotificationData
  const kind = asString(data.kind) || asString(data.type)

  if (kind !== "incoming_call_v2" && kind !== "call_v2") return

  const conversationId = asString(data.conversationId)
  const callSessionId = asString(data.callSessionId)
  const fromUserId = asString(data.fromUserId) || asString(data.callerUserId)
  const callerName =
    asString(data.callerName) ||
    asString(data.title) ||
    notification.request.content.title ||
    notification.request.content.body ||
    "VIVOS"
  const callType = data.callType === "video" ? "video" : "audio"

  void startVivosCallV2Ringtone({
    callSessionId,
    callerName,
    callType,
    conversationId,
    fromUserId,
  })

  if (!conversationId || !callSessionId || !fromUserId) return
  if (isActiveVivosCallConversation(conversationId)) return

  setGlobalIncomingVivosCall({
    conversationId,
    callSessionId,
    fromUserId,
    callerName,
    callType,
    action: "open",
  })
}
