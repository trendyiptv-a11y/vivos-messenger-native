import { useEffect } from "react"
import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import {
  addRemoteIceCandidate,
  applyRemoteDescription,
  createLocalAnswer,
  createLocalOffer,
  createWebRtcManager,
  getWebRtcManagerState,
  markWebRtcConnected,
  prepareWebRtcLocalStream,
  setLocalIceCandidateHandler,
} from "@/lib/calls/webrtc"
import { stopCallFeedback } from "@/lib/calls/ringtone"
import {
  buildWebRtcSignalPayload,
  sendAnswerSignal,
  sendIceCandidateSignal,
  sendOfferSignal,
} from "@/lib/calls/webrtcSignaling"
import { CallType, IncomingCall } from "@/types/call"
import { IceCandidateLike, SessionDescriptionLike } from "@/types/webrtc"

type CallBroadcastPayload = {
  callSessionId?: string
  conversationId?: string
  fromUserId?: string
  toUserId?: string
  callType?: string
  sdp?: SessionDescriptionLike
  candidate?: IceCandidateLike
}

type Args = {
  conversationId: string
  userId: string | null
  currentCallSessionId: string | null
  currentCallType: CallType
  callChannelRef: React.MutableRefObject<RealtimeChannel | null>
  startMedia: (callType: CallType) => Promise<void>
  setIncomingCall: (call: IncomingCall | null) => void | Promise<void>
  setCurrentCallType: (callType: CallType) => void
  setCallUiState: (state: "idle" | "outgoing" | "incoming" | "connected") => void
  setWebrtcStatus: (status: string) => void
  resetCallFlow: (status?: string) => Promise<void>
}

function payloadToIncomingCall(payload: CallBroadcastPayload): IncomingCall | null {
  if (!payload.callSessionId || !payload.conversationId || !payload.fromUserId) return null
  return {
    callSessionId: String(payload.callSessionId),
    conversationId: String(payload.conversationId),
    fromUserId: String(payload.fromUserId),
    callType: payload.callType === "video" ? "video" : "audio",
  }
}

function connectedStatusLabel() {
  const state = getWebRtcManagerState()
  if (!state) return "Conectat"
  const audio = state.remoteAudioTracks ?? 0
  const video = state.remoteVideoTracks ?? 0
  return `Conectat: remote audio=${audio}, video=${video}`
}

export function useChatCallSignaling({
  conversationId,
  userId,
  currentCallSessionId,
  currentCallType,
  callChannelRef,
  startMedia,
  setIncomingCall,
  setCurrentCallType,
  setCallUiState,
  setWebrtcStatus,
  resetCallFlow,
}: Args) {
  useEffect(() => {
    if (!conversationId || !userId) {
      setLocalIceCandidateHandler(null)
      return
    }

    setLocalIceCandidateHandler(async (candidate) => {
      if (!currentCallSessionId) return

      const signalBase = buildWebRtcSignalPayload({
        callSessionId: currentCallSessionId,
        conversationId,
        fromUserId: userId,
        callType: currentCallType,
      })

      await sendIceCandidateSignal(callChannelRef.current, {
        ...signalBase,
        candidate,
      })
      setWebrtcStatus("ICE local trimis")
    })

    return () => {
      setLocalIceCandidateHandler(null)
    }
  }, [callChannelRef, conversationId, currentCallSessionId, currentCallType, setWebrtcStatus, userId])

  useEffect(() => {
    if (!conversationId) return
    let active = true

    const callChannel = supabase
      .channel(`call:conversation:${conversationId}`)
      .on("broadcast", { event: "call_invite" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!active || !userId) return
        if (payload?.toUserId !== userId || payload.fromUserId === userId) return
        const incoming = payloadToIncomingCall(payload)
        if (!incoming) return
        await setIncomingCall(incoming)
      })
      .on("broadcast", { event: "call_accept" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!active) return
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId || !userId) return
        const acceptedType: CallType = payload.callType === "video" ? "video" : "audio"
        try {
          await stopCallFeedback()
          await startMedia(acceptedType)
          await createWebRtcManager(acceptedType)
          await prepareWebRtcLocalStream()
          const offer = await createLocalOffer()
          if (!active) return
          const signalBase = buildWebRtcSignalPayload({
            callSessionId: payload.callSessionId,
            conversationId,
            fromUserId: userId,
            callType: acceptedType,
          })
          await sendOfferSignal(callChannelRef.current, { ...signalBase, sdp: offer })
          if (!active) return
          setCurrentCallType(acceptedType)
          setWebrtcStatus("Offer local trimis")
          await setIncomingCall(null)
          setCallUiState("outgoing")
        } catch (error) {
          console.warn("call_accept handling failed", error)
          if (active) await resetCallFlow("Eroare WebRTC")
        }
      })
      .on("broadcast", { event: "call_reject" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!active) return
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId) return
        await stopCallFeedback()
        await resetCallFlow("Respins")
      })
      .on("broadcast", { event: "call_end" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!active) return
        if (!payload?.callSessionId) return
        if (currentCallSessionId && payload.callSessionId !== currentCallSessionId) return
        await stopCallFeedback()
        await resetCallFlow("Închis")
      })
      .on("broadcast", { event: "webrtc_offer" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!active) return
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId || !payload?.sdp || !userId) return
        const offerType: CallType = payload.callType === "video" ? "video" : "audio"
        try {
          await createWebRtcManager(offerType)
          await prepareWebRtcLocalStream()
          await applyRemoteDescription(payload.sdp)
          const answer = await createLocalAnswer()
          if (!active) return
          const signalBase = buildWebRtcSignalPayload({
            callSessionId: payload.callSessionId,
            conversationId,
            fromUserId: userId,
            callType: offerType,
          })
          await sendAnswerSignal(callChannelRef.current, { ...signalBase, sdp: answer })
          if (!active) return
          await stopCallFeedback()
          setCurrentCallType(offerType)
          setCallUiState("connected")
          setWebrtcStatus("Offer primit, answer trimis")
        } catch (error) {
          console.warn("webrtc_offer handling failed", error)
          if (active) await resetCallFlow("Eroare WebRTC")
        }
      })
      .on("broadcast", { event: "webrtc_answer" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!active) return
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId || !payload?.sdp) return
        try {
          await applyRemoteDescription(payload.sdp)
          await markWebRtcConnected()
          await stopCallFeedback()
          if (active) {
            setCallUiState("connected")
            setWebrtcStatus(connectedStatusLabel())
          }
        } catch (error) {
          console.warn("webrtc_answer handling failed", error)
          if (active) await resetCallFlow("Eroare WebRTC")
        }
      })
      .on("broadcast", { event: "ice_candidate" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!active) return
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId || !payload?.candidate) return
        try {
          await addRemoteIceCandidate(payload.candidate)
          if (active) setWebrtcStatus("ICE primit")
        } catch (error) {
          console.warn("ice_candidate handling failed", error)
        }
      })
      .subscribe()

    callChannelRef.current = callChannel

    return () => {
      active = false
      callChannelRef.current = null
      supabase.removeChannel(callChannel).catch((error) => {
        console.warn("call channel cleanup failed", error)
      })
    }
  }, [conversationId, currentCallSessionId, resetCallFlow, setCallUiState, setCurrentCallType, setIncomingCall, setWebrtcStatus, startMedia, userId, callChannelRef])
}
