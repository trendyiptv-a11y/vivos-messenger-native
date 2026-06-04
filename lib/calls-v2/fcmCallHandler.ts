import { AppState, Platform } from "react-native"
import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging"
import {
  displayVivosCallV2IncomingNotification,
  cancelVivosCallV2IncomingNotification,
} from "@/lib/calls-v2/notifeeCallV2"
import {
  clearPendingVivosCallFromNotification,
  setPendingVivosCallFromNotification,
  VivosCallNotificationAction,
} from "@/lib/calls-v2/callNotificationState"
import {
  isSameActiveVivosCall,
  shouldBlockIncomingVivosCall,
} from "@/lib/calls-v2/activeCallRuntime"
import { VivosCallType } from "@/lib/calls-v2/types"

type VivosCallFcmData = {
  kind?: string
  type?: string
  conversationId?: string
  callSessionId?: string
  fromUserId?: string
  callerUserId?: string
  callerName?: string
  callType?: string
  action?: string
}

export type VivosForegroundFcmCall = {
  conversationId: string
  callSessionId: string
  fromUserId: string
  callerName: string
  callType: VivosCallType
}

type ForegroundCallHandler = (call: VivosForegroundFcmCall) => void | Promise<void>

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function getCallKind(data: VivosCallFcmData | undefined | null) {
  return asString(data?.kind) || asString(data?.type)
}

function isIncomingCallV2(data: VivosCallFcmData | undefined | null) {
  const kind = getCallKind(data)
  return kind === "incoming_call_v2" || kind === "call_v2"
}

function isCancelledCallV2(data: VivosCallFcmData | undefined | null) {
  const kind = getCallKind(data)
  return kind === "call_v2_cancelled" || kind === "call_cancelled_v2" || kind === "call_v2_ended"
}

function isAppInForeground() {
  return AppState.currentState === "active"
}

function normalizeCallData(data: VivosCallFcmData | undefined | null, allowCancelled = false): VivosForegroundFcmCall | null {
  if (!isIncomingCallV2(data) && !(allowCancelled && isCancelledCallV2(data))) return null

  const conversationId = asString(data?.conversationId)
  const callSessionId = asString(data?.callSessionId)
  const fromUserId = asString(data?.fromUserId) || asString(data?.callerUserId)

  if (!conversationId || !callSessionId || !fromUserId) return null

  return {
    conversationId,
    callSessionId,
    fromUserId,
    callerName: asString(data?.callerName) || "Un membru VIVOS",
    callType: data?.callType === "video" ? "video" : ("audio" as VivosCallType),
  }
}

function normalizeAction(value: unknown): VivosCallNotificationAction {
  return value === "accept" || value === "reject" ? value : "open"
}

async function handleIncomingCallFcmMessage(
  message: FirebaseMessagingTypes.RemoteMessage,
  onForegroundIncomingCall?: ForegroundCallHandler
) {
  const data = (message.data ?? {}) as VivosCallFcmData

  if (isCancelledCallV2(data)) {
    clearPendingVivosCallFromNotification()
    await cancelVivosCallV2IncomingNotification()
    return
  }

  const call = normalizeCallData(data)

  if (!call) return

  if (
    shouldBlockIncomingVivosCall({
      conversationId: call.conversationId,
      callSessionId: call.callSessionId,
    })
  ) {
    clearPendingVivosCallFromNotification()
    await cancelVivosCallV2IncomingNotification()
    return
  }

  if (
    isAppInForeground() &&
    isSameActiveVivosCall({
      conversationId: call.conversationId,
      callSessionId: call.callSessionId,
    })
  ) {
    await cancelVivosCallV2IncomingNotification()
    return
  }

  setPendingVivosCallFromNotification(
    {
      conversationId: call.conversationId,
      callSessionId: call.callSessionId,
      fromUserId: call.fromUserId,
      callType: call.callType,
    },
    normalizeAction(data.action)
  )

  if (isAppInForeground() && onForegroundIncomingCall) {
    await onForegroundIncomingCall(call)
    return
  }

  await displayVivosCallV2IncomingNotification({
    conversationId: call.conversationId,
    callSessionId: call.callSessionId,
    fromUserId: call.fromUserId,
    callerName: call.callerName,
    callType: call.callType,
  })
}

export function registerVivosCallV2FcmBackgroundHandler() {
  if (Platform.OS !== "android") return

  messaging().setBackgroundMessageHandler(async (message) => {
    await handleIncomingCallFcmMessage(message)
  })
}

export function registerVivosCallV2FcmForegroundHandler(onIncomingCall?: ForegroundCallHandler) {
  if (Platform.OS !== "android") return () => {}

  const unsubscribeMessage = messaging().onMessage(async (message) => {
    await handleIncomingCallFcmMessage(message, onIncomingCall)
  })

  const unsubscribeTokenRefresh = messaging().onTokenRefresh(() => {
    // Token refresh este salvat de registerFcmToken() la login/app start.
    // Dacă vrem mai târziu, putem chema registerFcmToken() aici.
  })

  return () => {
    unsubscribeMessage()
    unsubscribeTokenRefresh()
  }
}

export async function stopVivosCallV2FcmCall() {
  clearPendingVivosCallFromNotification()
  await cancelVivosCallV2IncomingNotification()
}
