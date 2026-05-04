import * as Notifications from "expo-notifications"
import { Router } from "expo-router"
import { setIncomingCallState } from "@/lib/calls/callState"
import { IncomingCall } from "@/types/call"

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

export function routeNotificationResponse(router: Router, response: Notifications.NotificationResponse) {
  const data = getNotificationData(response)
  const kind = asString(data.kind) || asString(data.type)
  const conversationId = asString(data.conversationId)

  if (!conversationId) return

  if (kind === "incoming_call") {
    const callSessionId = asString(data.callSessionId)
    const fromUserId = asString(data.fromUserId) || asString(data.callerUserId)

    if (callSessionId && fromUserId) {
      const call: IncomingCall = {
        callSessionId,
        conversationId,
        fromUserId,
        callType: data.callType === "video" ? "video" : "audio",
      }
      setIncomingCallState(call)
    }
  }

  router.push({ pathname: "/chat/[id]", params: { id: conversationId } })
}

export async function routeInitialNotificationResponse(router: Router) {
  const lastResponse = await Notifications.getLastNotificationResponseAsync()
  if (lastResponse) routeNotificationResponse(router, lastResponse)
}
