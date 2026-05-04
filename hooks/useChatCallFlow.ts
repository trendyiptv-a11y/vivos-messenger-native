import { useCallback, useState } from "react"
import { RealtimeChannel } from "@supabase/supabase-js"
import { CallType, CallUiState, IncomingCall } from "@/types/call"
import {
  acceptCallSession,
  createOutgoingCallSession,
  endCallSession,
  logCallEvent,
  rejectCallSession,
} from "@/lib/calls/signaling"
import { closeWebRtcManager, createWebRtcManager, prepareWebRtcLocalStream } from "@/lib/calls/webrtc"
import { startIncomingCallFeedback, stopIncomingCallFeedback } from "@/lib/calls/ringtone"
import { sendCallPush } from "@/lib/push"
import { useCallMedia } from "@/hooks/useCallMedia"

type Args = {
  conversationId: string
  userId: string | null
  calleeId: string | null
  callerName?: string
  callChannelRef: React.MutableRefObject<RealtimeChannel | null>
}

export function useChatCallFlow({ conversationId, userId, calleeId, callerName = "VIVOS", callChannelRef }: Args) {
  const [callUiState, setCallUiState] = useState<CallUiState>("idle")
  const [currentCallType, setCurrentCallType] = useState<CallType>("audio")
  const [callBusy, setCallBusy] = useState(false)
  const [currentCallSessionId, setCurrentCallSessionId] = useState<string | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [webrtcStatus, setWebrtcStatus] = useState("Inactiv")

  const { mediaReady, startMedia, stopMedia } = useCallMedia()

  const resetCallFlow = useCallback(async (status = "Închis") => {
    await stopIncomingCallFeedback()
    await stopMedia()
    await closeWebRtcManager()
    setIncomingCall(null)
    setCurrentCallSessionId(null)
    setCallUiState("idle")
    setWebrtcStatus(status)
  }, [stopMedia])

  const receiveIncomingCall = useCallback(async (call: IncomingCall, incomingCallerName = "VIVOS") => {
    setIncomingCall(call)
    setCurrentCallSessionId(call.callSessionId)
    setCurrentCallType(call.callType)
    setWebrtcStatus("În așteptare")
    setCallUiState("incoming")
    await startIncomingCallFeedback(incomingCallerName, call.callType)
  }, [])

  const startOutgoingCall = useCallback(async (callType: CallType) => {
    if (!userId || !calleeId || callBusy || callUiState !== "idle") return

    try {
      setCallBusy(true)
      setCurrentCallType(callType)
      await startMedia(callType)
      await createWebRtcManager(callType)
      await prepareWebRtcLocalStream()
      setWebrtcStatus("Media pregătită")

      const session = await createOutgoingCallSession({
        conversationId,
        callerId: userId,
        calleeId,
        callType,
      })

      await logCallEvent({
        callSessionId: session.id,
        actorId: userId,
        eventType: "invite",
        payload: { conversationId, callType },
      })

      await callChannelRef.current?.send({
        type: "broadcast",
        event: "call_invite",
        payload: {
          callSessionId: session.id,
          conversationId,
          fromUserId: userId,
          toUserId: calleeId,
          callType,
        },
      })

      sendCallPush({
        targetUserId: calleeId,
        callerUserId: userId,
        conversationId,
        callerName,
        callType,
        callSessionId: session.id,
      })

      setCurrentCallSessionId(session.id)
      setCallUiState("outgoing")
      return session
    } catch (error) {
      console.error("startOutgoingCall error", error)
      await resetCallFlow("Eroare la pornire")
      return null
    } finally {
      setCallBusy(false)
    }
  }, [userId, calleeId, callBusy, callUiState, startMedia, conversationId, callChannelRef, resetCallFlow, callerName])

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall?.callSessionId || !userId) return false

    try {
      setCallBusy(true)
      await stopIncomingCallFeedback()
      await startMedia(incomingCall.callType)
      await createWebRtcManager(incomingCall.callType)
      await prepareWebRtcLocalStream()
      await acceptCallSession(incomingCall.callSessionId, incomingCall.callType)

      await logCallEvent({
        callSessionId: incomingCall.callSessionId,
        actorId: userId,
        eventType: "accept",
        payload: { conversationId, callType: incomingCall.callType },
      })

      await callChannelRef.current?.send({
        type: "broadcast",
        event: "call_accept",
        payload: {
          callSessionId: incomingCall.callSessionId,
          conversationId,
          fromUserId: userId,
          callType: incomingCall.callType,
        },
      })

      setWebrtcStatus("Acceptat, aștept offer")
      setCurrentCallSessionId(incomingCall.callSessionId)
      setCurrentCallType(incomingCall.callType)
      setCallUiState("connected")
      setIncomingCall(null)
      return true
    } catch (error) {
      console.error("acceptIncomingCall error", error)
      await resetCallFlow("Eroare la acceptare")
      return false
    } finally {
      setCallBusy(false)
    }
  }, [incomingCall, userId, startMedia, conversationId, callChannelRef, resetCallFlow])

  const rejectIncomingCall = useCallback(async () => {
    if (!incomingCall?.callSessionId || !userId) return

    try {
      setCallBusy(true)
      await stopIncomingCallFeedback()
      await rejectCallSession(incomingCall.callSessionId)

      await logCallEvent({
        callSessionId: incomingCall.callSessionId,
        actorId: userId,
        eventType: "reject",
        payload: { conversationId },
      })

      await callChannelRef.current?.send({
        type: "broadcast",
        event: "call_reject",
        payload: {
          callSessionId: incomingCall.callSessionId,
          conversationId,
          fromUserId: userId,
        },
      })
    } catch (error) {
      console.error("rejectIncomingCall error", error)
    } finally {
      await resetCallFlow("Respins")
      setCallBusy(false)
    }
  }, [incomingCall, userId, conversationId, callChannelRef, resetCallFlow])

  const stopCurrentCall = useCallback(async () => {
    try {
      await stopIncomingCallFeedback()
      if (currentCallSessionId) {
        await endCallSession(currentCallSessionId)

        if (userId) {
          await logCallEvent({
            callSessionId: currentCallSessionId,
            actorId: userId,
            eventType: "end",
            payload: { conversationId, callType: currentCallType },
          })
        }

        await callChannelRef.current?.send({
          type: "broadcast",
          event: "call_end",
          payload: {
            callSessionId: currentCallSessionId,
            conversationId,
            fromUserId: userId,
            callType: currentCallType,
          },
        })
      }
    } catch (error) {
      console.error("stopCurrentCall error", error)
    } finally {
      await resetCallFlow("Închis")
    }
  }, [currentCallSessionId, userId, conversationId, currentCallType, callChannelRef, resetCallFlow])

  return {
    callUiState,
    currentCallType,
    callBusy,
    currentCallSessionId,
    incomingCall,
    webrtcStatus,
    mediaReady,
    startMedia,
    stopMedia,
    setIncomingCall,
    receiveIncomingCall,
    setCurrentCallSessionId,
    setCurrentCallType,
    setCallUiState,
    setWebrtcStatus,
    startOutgoingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    stopCurrentCall,
    resetCallFlow,
  }
}
