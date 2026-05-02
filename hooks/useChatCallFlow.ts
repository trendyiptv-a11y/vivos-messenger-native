import { useCallback, useState } from "react"
import { RealtimeChannel } from "@supabase/supabase-js"
import { CallType, CallUiState, IncomingCall } from "@/types/call"
import { createOutgoingCallSession, endCallSession, logCallEvent } from "@/lib/calls/signaling"
import { createWebRtcManager, prepareWebRtcLocalStream, closeWebRtcManager } from "@/lib/calls/webrtc"
import { useCallMedia } from "@/hooks/useCallMedia"

type Args = {
  conversationId: string
  userId: string | null
  calleeId: string | null
  callChannelRef: React.MutableRefObject<RealtimeChannel | null>
}

export function useChatCallFlow({ conversationId, userId, calleeId, callChannelRef }: Args) {
  const [callUiState, setCallUiState] = useState<CallUiState>("idle")
  const [currentCallType, setCurrentCallType] = useState<CallType>("audio")
  const [callBusy, setCallBusy] = useState(false)
  const [currentCallSessionId, setCurrentCallSessionId] = useState<string | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [webrtcStatus, setWebrtcStatus] = useState("Inactiv")

  const { mediaReady, startMedia, stopMedia } = useCallMedia()

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

      setCurrentCallSessionId(session.id)
      setCallUiState("outgoing")
    } catch (error) {
      console.error("startOutgoingCall error", error)
      await stopMedia()
      await closeWebRtcManager()
    } finally {
      setCallBusy(false)
    }
  }, [userId, calleeId, callBusy, callUiState, startMedia, conversationId, callChannelRef, stopMedia])

  const stopCurrentCall = useCallback(async () => {
    try {
      if (currentCallSessionId) {
        await endCallSession(currentCallSessionId)
      }
    } catch (error) {
      console.error("stopCurrentCall error", error)
    } finally {
      await stopMedia()
      await closeWebRtcManager()
      setIncomingCall(null)
      setCurrentCallSessionId(null)
      setCallUiState("idle")
      setWebrtcStatus("Închis")
    }
  }, [currentCallSessionId, stopMedia])

  return {
    callUiState,
    currentCallType,
    callBusy,
    currentCallSessionId,
    incomingCall,
    webrtcStatus,
    mediaReady,
    setIncomingCall,
    setCurrentCallSessionId,
    setCurrentCallType,
    setCallUiState,
    setWebrtcStatus,
    startOutgoingCall,
    stopCurrentCall,
  }
}
