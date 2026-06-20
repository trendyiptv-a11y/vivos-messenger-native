import * as Notifications from "expo-notifications"
import { Router } from "expo-router"
import { NOTIFICATION_ACTIONS } from "@/lib/notifications"
import {
  setPendingVivosCallFromNotification,
  VivosCallNotificationAction,
} from "@/lib/calls-v2/callNotificationState"
import { stopVivosCallV2Ringtone } from "@/lib/calls-v2/callRingtone"

type NotificationData = {
  kind?: unknown
  type?: unknown
  conversationId?: unknown
  callSessionId?: unknown
  callType?: unknown
  fromUserId?: unknown
  callerUserId?: unknown
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

  // În foreground apelurile sunt conduse de Supabase Realtime + call_sessions.
  // Push-ul de apel este ignorat aici ca să nu dubleze bannerul/ringtone-ul intern.
  if (kind === "incoming_call_v2" || kind === "call_v2" || kind === "incoming_call") return
}
