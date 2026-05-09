import { VivosCallType } from "@/lib/calls-v2/types"

export type VivosCallNotificationAction = "open" | "accept" | "reject"

export type PendingVivosCallFromNotification = {
  conversationId: string
  callSessionId: string
  fromUserId: string
  callType: VivosCallType
}

let pendingCall:
  | {
      call: PendingVivosCallFromNotification
      action: VivosCallNotificationAction
    }
  | null = null

export function setPendingVivosCallFromNotification(
  call: PendingVivosCallFromNotification,
  action: VivosCallNotificationAction = "open"
) {
  pendingCall = {
    call,
    action,
  }
}

export function consumePendingVivosCallFromNotification(conversationId: string) {
  if (!pendingCall) return null
  if (pendingCall.call.conversationId !== conversationId) return null

  const value = pendingCall
  pendingCall = null
  return value
}

export function clearPendingVivosCallFromNotification() {
  pendingCall = null
}
