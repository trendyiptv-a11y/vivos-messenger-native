import { VivosCallNotificationAction } from "@/lib/calls-v2/callNotificationState"
import { VivosCallType } from "@/lib/calls-v2/types"

export type GlobalIncomingVivosCall = {
  conversationId: string
  callSessionId: string
  fromUserId: string
  callerName: string
  callType: VivosCallType
  action: VivosCallNotificationAction
  receivedAt: number
}

type Listener = (call: GlobalIncomingVivosCall | null) => void

let currentGlobalIncomingCall: GlobalIncomingVivosCall | null = null
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener(currentGlobalIncomingCall))
}

export function getGlobalIncomingVivosCall() {
  return currentGlobalIncomingCall
}

export function setGlobalIncomingVivosCall(call: Omit<GlobalIncomingVivosCall, "receivedAt"> & { receivedAt?: number }) {
  currentGlobalIncomingCall = {
    ...call,
    receivedAt: call.receivedAt ?? Date.now(),
  }
  emit()
}

export function clearGlobalIncomingVivosCall(callSessionId?: string | null) {
  if (callSessionId && currentGlobalIncomingCall?.callSessionId !== callSessionId) return
  currentGlobalIncomingCall = null
  emit()
}

export function subscribeGlobalIncomingVivosCall(listener: Listener) {
  listeners.add(listener)
  listener(currentGlobalIncomingCall)

  return () => {
    listeners.delete(listener)
  }
}
