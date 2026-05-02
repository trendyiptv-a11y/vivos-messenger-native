import { useEffect } from "react"
import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import {
  addRemoteIceCandidate,
  applyRemoteDescription,
  createLocalAnswer,
  createLocalOffer,
  createWebRtcManager,
  markWebRtcConnected,
  prepareWebRtcLocalStream,
  setLocalIceCandidateHandler,
} from "@/lib/calls/webrtc"
import {
  buildWebRtcSignalPayload,
  sendAnswerSignal,
  sendIceCandidateSignal,
  sendOfferSignal,
} from "@/lib/calls/webrtcSignaling"
import { CallType } from "@/types/call"
import { IceCandidateLike, SessionDescriptionLike } from "@/types/webrtc"

type CallBroadcastPayload = {
  callSessionId?: string
  conversationId?: string
  fromUserId?: string
  callType?: string
  sdp?: SessionDescriptionLike
  candidate?: IceCandidateLike
}

type Args = {
  conversationId: string
  userId: string | null
  currentCallSessionId: string | null
  callChannelRef: React.MutableRefObject<RealtimeChannel | null>
  startMedia: (callType: CallType) => Promise<void>
  setIncomingCall: (call: null) => void
  setCurrentCallType: (callType: CallType) => void
  setCallUiState: (state: "idle" | "outgoing" | "incoming" | "connected") => void
  setWebrtcStatus: (status: string) => void
  resetCallFlow: (status?: string) => Promise<void>
}

export function useChatCallSignaling({
  conversationId,
  userId,
  currentCallSessionId,
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
        callType: "audio",
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
  }, [callChannelRef, conversationId, currentCallSessionId, setWebrtcStatus, userId])

  useEffect(() => {
    if (!conversationId) return

    const callChannel = supabase
      .channel(`call:conversation:${conversationId}`)
      .on("broadcast", { event: "call_accept" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId || !userId) return
        const acceptedType: CallType = payload.callType === "video" ? "video" : "audio"
        await startMedia(acceptedType)
        await createWebRtcManager(acceptedType)
        await prepareWebRtcLocalStream()
        const offer = await createLocalOffer()
        const signalBase = buildWebRtcSignalPayload({
          callSessionId: payload.callSessionId,
          conversationId,
          fromUserId: userId,
          callType: acceptedType,
        })
        await sendOfferSignal(callChannelRef.current, { ...signalBase, sdp: offer })
        setCurrentCallType(acceptedType)
        setWebrtcStatus("Offer local trimis")
        setIncomingCall(null)
        setCallUiState("connected")
      })
      .on("broadcast", { event: "call_reject" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId) return
        await resetCallFlow("Respins")
      })
      .on("broadcast", { event: "call_end" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!payload?.callSessionId) return
        if (currentCallSessionId && payload.callSessionId !== currentCallSessionId) return
        await resetCallFlow("Închis")
      })
      .on("broadcast", { event: "webrtc_offer" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId || !payload?.sdp || !userId) return
        const offerType: CallType = payload.callType === "video" ? "video" : "audio"
        await createWebRtcManager(offerType)
        await prepareWebRtcLocalStream()
        await applyRemoteDescription(payload.sdp)
        const answer = await createLocalAnswer()
        const signalBase = buildWebRtcSignalPayload({
          callSessionId: payload.callSessionId,
          conversationId,
          fromUserId: userId,
          callType: offerType,
        })
        await sendAnswerSignal(callChannelRef.current, { ...signalBase, sdp: answer })
        setCurrentCallType(offerType)
        setWebrtcStatus("Offer primit, answer trimis")
      })
      .on("broadcast", { event: "webrtc_answer" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId || !payload?.sdp) return
        await applyRemoteDescription(payload.sdp)
        await markWebRtcConnected()
        setWebrtcStatus("Answer primit")
      })
      .on("broadcast", { event: "ice_candidate" }, async ({ payload }: { payload: CallBroadcastPayload }) => {
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId || !payload?.candidate) return
        await addRemoteIceCandidate(payload.candidate)
        setWebrtcStatus("ICE primit")
      })
      .subscribe()

    callChannelRef.current = callChannel

    return () => {
      callChannelRef.current = null
      supabase.removeChannel(callChannel)
    }
  }, [conversationId, currentCallSessionId, resetCallFlow, setCallUiState, setCurrentCallType, setIncomingCall, setWebrtcStatus, startMedia, userId, callChannelRef])
}
