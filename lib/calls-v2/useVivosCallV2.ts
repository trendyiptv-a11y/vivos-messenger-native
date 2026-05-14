import { useCallback, useEffect, useRef, useState } from "react"
import { RealtimeChannel } from "@supabase/supabase-js"
import {
  VivosCallRuntimeState,
  VivosCallSignalPayload,
  VivosCallType,
} from "@/lib/calls-v2/types"
import {
  createIdleCallState,
  endCallState,
  failCallState,
  setCallStatus,
  setLocalStreamState,
  setRemoteStreamState,
  startIncomingCallState,
  startOutgoingCallState,
} from "@/lib/calls-v2/stateMachine"
import {
  getMediaSnapshot,
  setCameraEnabled,
  setMicrophoneEnabled,
  startLocalMedia,
  stopLocalMedia,
  switchCamera,
} from "@/lib/calls-v2/media"
import {
  addVivosRemoteIceCandidate,
  applyVivosRemoteDescription,
  closeVivosPeerConnection,
  createVivosAnswer,
  createVivosOffer,
  createVivosPeerConnection,
  getVivosPeerSnapshot,
  setVivosLocalIceHandler,
  VivosIceCandidate,
} from "@/lib/calls-v2/peer"
import {
  createVivosCallChannel,
  sendVivosCallAccept,
  sendVivosCallEnd,
  sendVivosCallInvite,
  sendVivosCallReject,
  sendVivosIceCandidate,
  sendVivosWebRtcAnswer,
  sendVivosWebRtcOffer,
} from "@/lib/calls-v2/signaling"
import {
  getVivosAudioRouteSnapshot,
  startVivosAudioRoute,
  stopVivosAudioRoute,
  subscribeVivosAudioRoute,
  toggleVivosSpeaker,
} from "@/lib/calls-v2/audioRoute"
import { notifyVivosCallV2, notifyVivosCallV2Cancelled } from "@/lib/calls-v2/callNotify"
import { consumePendingVivosCallFromNotification } from "@/lib/calls-v2/callNotificationState"
import {
  clearActiveVivosCallSession,
  setActiveVivosCallSession,
} from "@/lib/calls-v2/activeCallRuntime"
import { cancelVivosCallV2IncomingNotification } from "@/lib/calls-v2/notifeeCallV2"

type UseVivosCallV2Args = {
  conversationId: string
  userId: string | null
  remoteUserId: string | null
  remoteName?: string
  selfName?: string
}

function createCallSessionId() {
  return `vivos-call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeCallerName(value?: string | null) {
  return value?.trim() || "Un membru VIVOS"
}

export function useVivosCallV2({ conversationId, userId, remoteUserId, selfName }: UseVivosCallV2Args) {
  const [callState, setCallState] = useState<VivosCallRuntimeState>(() => createIdleCallState())

  const channelRef = useRef<RealtimeChannel | null>(null)
  const closeChannelRef = useRef<null | (() => Promise<void>)>(null)
  const currentCallRef = useRef<{
    callSessionId: string | null
    callType: VivosCallType
    remoteUserId: string | null
  }>({
    callSessionId: null,
    callType: "audio",
    remoteUserId: null,
  })

  const pendingRemoteIceRef = useRef<VivosIceCandidate[]>([])

  const refreshSnapshots = useCallback(() => {
    const media = getMediaSnapshot()
    const peer = getVivosPeerSnapshot()
    const audioRoute = getVivosAudioRouteSnapshot()

    setCallState((current) => {
      let next = current

      next = {
        ...next,
        localStreamReady: Boolean(media.localStreamURL),
        localStreamURL: media.localStreamURL,
        microphoneEnabled: media.microphoneEnabled,
        cameraEnabled: media.cameraEnabled,
        speakerEnabled: audioRoute.speakerEnabled,
      }

      next = setRemoteStreamState(next, peer.remoteStreamURL)

      const peerFailed =
        peer.connectionState === "failed" ||
        peer.iceConnectionState === "failed"

      if (peerFailed && next.status !== "failed") {
        next = failCallState(next, "Conexiunea WebRTC/ICE a eșuat")
      }

      return {
        ...next,
        diagnostics: [
          ...next.diagnostics.slice(-8),
          ...peer.diagnostics.slice(-6),
          ...audioRoute.diagnostics.slice(-4),
        ].slice(-18),
      }
    })

    return { media, peer }
  }, [])

  const sendIceForCurrentCall = useCallback(
    async (candidate: VivosIceCandidate) => {
      if (!userId || !conversationId) return

      const current = currentCallRef.current
      if (!current.callSessionId || !current.remoteUserId) return

      await sendVivosIceCandidate({
        channel: channelRef.current,
        callSessionId: current.callSessionId,
        conversationId,
        fromUserId: userId,
        toUserId: current.remoteUserId,
        callType: current.callType,
        candidate,
      })
    },
    [conversationId, userId]
  )

  const prepareLocalPeer = useCallback(
    async (callType: VivosCallType) => {
      const media = await startLocalMedia(callType)
      await createVivosPeerConnection(callType)
      const audioRoute = await startVivosAudioRoute(callType)

      setVivosLocalIceHandler(async (candidate) => {
        await sendIceForCurrentCall(candidate)
      })

      setCallState((current) => {
        let next = setLocalStreamState(current, media.streamURL)
        next = {
          ...next,
          microphoneEnabled: media.audioTracks > 0,
          cameraEnabled: media.videoTracks > 0,
          speakerEnabled: audioRoute.speakerEnabled,
        }
        return next
      })

      refreshSnapshots()
      return media
    },
    [refreshSnapshots, sendIceForCurrentCall]
  )

  const markActiveCallSession = useCallback(
    (callSessionId: string | null | undefined) => {
      setActiveVivosCallSession({ conversationId, callSessionId })
    },
    [conversationId]
  )

  const cleanupMediaAndPeer = useCallback(async () => {
    const previousCallSessionId = currentCallRef.current.callSessionId

    setVivosLocalIceHandler(null)
    pendingRemoteIceRef.current = []
    await stopVivosAudioRoute()
    await closeVivosPeerConnection()
    await stopLocalMedia()
    clearActiveVivosCallSession(previousCallSessionId)
    currentCallRef.current = {
      callSessionId: null,
      callType: "audio",
      remoteUserId: null,
    }
  }, [])

  const applyPendingIce = useCallback(async () => {
    const pending = [...pendingRemoteIceRef.current]
    pendingRemoteIceRef.current = []

    for (const candidate of pending) {
      try {
        await addVivosRemoteIceCandidate(candidate)
      } catch (error) {
        console.warn("V2 pending ICE failed", error)
      }
    }

    refreshSnapshots()
  }, [refreshSnapshots])

  const notifyCancelForCurrentCall = useCallback(
    async (current: { callSessionId: string | null; callType: VivosCallType; remoteUserId: string | null }) => {
      if (!userId || !conversationId || !current.callSessionId || !current.remoteUserId) return

      await notifyVivosCallV2Cancelled({
        conversationId,
        callSessionId: current.callSessionId,
        fromUserId: userId,
        toUserId: current.remoteUserId,
        callType: current.callType,
        callerName: normalizeCallerName(selfName),
      })
    },
    [conversationId, selfName, userId]
  )

  const handleSignal = useCallback(
    async (signal: VivosCallSignalPayload) => {
      if (!userId) return

      try {
        if (signal.type === "call_invite") {
          currentCallRef.current = {
            callSessionId: signal.callSessionId,
            callType: signal.callType,
            remoteUserId: signal.fromUserId,
          }
          markActiveCallSession(signal.callSessionId)
          void cancelVivosCallV2IncomingNotification()

          setCallState(
            startIncomingCallState({
              callSessionId: signal.callSessionId,
              conversationId: signal.conversationId,
              remoteUserId: signal.fromUserId,
              callType: signal.callType,
            })
          )

          return
        }

        if (signal.type === "call_accept") {
          const current = currentCallRef.current
          if (signal.callSessionId !== current.callSessionId) return

          void cancelVivosCallV2IncomingNotification()
          setCallState((state) => setCallStatus(state, "connecting", "Accept primit, creez offer"))

          const offer = await createVivosOffer()

          await sendVivosWebRtcOffer({
            channel: channelRef.current,
            callSessionId: signal.callSessionId,
            conversationId,
            fromUserId: userId,
            toUserId: signal.fromUserId,
            callType: signal.callType,
            sdp: offer,
          })

          setCallState((state) => setCallStatus(state, "connecting", "Offer trimis"))
          refreshSnapshots()
          return
        }

        if (signal.type === "call_reject") {
          const current = currentCallRef.current
          if (signal.callSessionId !== current.callSessionId) return

          await cleanupMediaAndPeer()
          await cancelVivosCallV2IncomingNotification()
          setCallState((state) => setCallStatus(state, "rejected", "Apel respins"))
          return
        }

        if (signal.type === "call_end") {
          const current = currentCallRef.current
          if (current.callSessionId && signal.callSessionId !== current.callSessionId) return

          await cleanupMediaAndPeer()
          await cancelVivosCallV2IncomingNotification()
          setCallState((state) => endCallState(state, "Apel închis de celălalt utilizator"))
          return
        }

        if (signal.type === "webrtc_offer") {
          const current = currentCallRef.current
          if (signal.callSessionId !== current.callSessionId || !signal.sdp) return

          void cancelVivosCallV2IncomingNotification()
          setCallState((state) => setCallStatus(state, "connecting", "Offer primit"))

          await applyVivosRemoteDescription(signal.sdp as any)
          await applyPendingIce()

          const answer = await createVivosAnswer()

          await sendVivosWebRtcAnswer({
            channel: channelRef.current,
            callSessionId: signal.callSessionId,
            conversationId,
            fromUserId: userId,
            toUserId: signal.fromUserId,
            callType: signal.callType,
            sdp: answer,
          })

          setCallState((state) => setCallStatus(state, "connected", "Answer trimis"))
          refreshSnapshots()
          return
        }

        if (signal.type === "webrtc_answer") {
          const current = currentCallRef.current
          if (signal.callSessionId !== current.callSessionId || !signal.sdp) return

          void cancelVivosCallV2IncomingNotification()
          await applyVivosRemoteDescription(signal.sdp as any)
          await applyPendingIce()

          setCallState((state) => setCallStatus(state, "connected", "Answer primit"))
          refreshSnapshots()
          return
        }

        if (signal.type === "ice_candidate") {
          const current = currentCallRef.current
          if (signal.callSessionId !== current.callSessionId || !signal.candidate) return

          try {
            await addVivosRemoteIceCandidate(signal.candidate as VivosIceCandidate)
          } catch {
            pendingRemoteIceRef.current = [...pendingRemoteIceRef.current, signal.candidate as VivosIceCandidate]
          }

          refreshSnapshots()
        }
      } catch (error) {
        console.warn("V2 signal handling failed", error)
        const message = error instanceof Error ? error.message : String(error)
        setCallState((state) => failCallState(state, message))
      }
    },
    [applyPendingIce, cleanupMediaAndPeer, conversationId, markActiveCallSession, refreshSnapshots, userId]
  )

  useEffect(() => {
    if (!conversationId || !userId) return

    const { channel, close } = createVivosCallChannel({
      conversationId,
      userId,
      onSignal: handleSignal,
    })

    channelRef.current = channel
    closeChannelRef.current = close

    return () => {
      channelRef.current = null
      closeChannelRef.current = null
      close().catch((error) => {
        console.warn("V2 call channel close failed", error)
      })
    }
  }, [conversationId, handleSignal, userId])

  useEffect(() => {
    const timer = setInterval(() => {
      const status = currentCallRef.current.callSessionId ? callState.status : "idle"
      if (status !== "idle" && status !== "ended" && status !== "failed" && status !== "rejected") {
        refreshSnapshots()
      }
    }, 700)

    return () => clearInterval(timer)
  }, [callState.status, refreshSnapshots])

  useEffect(() => {
    return subscribeVivosAudioRoute((audioRoute) => {
      setCallState((state) => ({
        ...state,
        speakerEnabled: audioRoute.speakerEnabled,
        diagnostics: [...state.diagnostics.slice(-14), ...audioRoute.diagnostics.slice(-4)].slice(-18),
      }))
    })
  }, [])

  useEffect(() => {
    return () => {
      cleanupMediaAndPeer().catch((error) => {
        console.warn("V2 cleanup on unmount failed", error)
      })
    }
  }, [cleanupMediaAndPeer])

  const startCall = useCallback(
    async (callType: VivosCallType) => {
      if (!userId || !remoteUserId || !conversationId) return false

      await cleanupMediaAndPeer()
      await cancelVivosCallV2IncomingNotification()
      setCallState(createIdleCallState())

      const callSessionId = createCallSessionId()

      currentCallRef.current = {
        callSessionId,
        callType,
        remoteUserId,
      }
      markActiveCallSession(callSessionId)

      setCallState(
        startOutgoingCallState({
          callSessionId,
          conversationId,
          remoteUserId,
          callType,
        })
      )

      try {
        await prepareLocalPeer(callType)

        await sendVivosCallInvite({
          channel: channelRef.current,
          callSessionId,
          conversationId,
          fromUserId: userId,
          toUserId: remoteUserId,
          callType,
        })

        void notifyVivosCallV2({
          conversationId,
          callSessionId,
          fromUserId: userId,
          toUserId: remoteUserId,
          callType,
          callerName: normalizeCallerName(selfName),
        })

        setCallState((state) => setCallStatus(state, "ringing_outgoing", "Invite trimis"))
        return true
      } catch (error) {
        console.warn("V2 startCall failed", error)
        const message = error instanceof Error ? error.message : String(error)
        await cleanupMediaAndPeer()
        setCallState((state) => failCallState(state, message))
        return false
      }
    },
    [cleanupMediaAndPeer, conversationId, markActiveCallSession, prepareLocalPeer, remoteUserId, selfName, userId]
  )

  const acceptCall = useCallback(async () => {
    if (!userId || !conversationId) return false

    const current = currentCallRef.current
    if (!current.callSessionId || !current.remoteUserId) return false

    try {
      await cancelVivosCallV2IncomingNotification()
      markActiveCallSession(current.callSessionId)
      setCallState((state) => setCallStatus(state, "connecting", "Accept apel"))

      await prepareLocalPeer(current.callType)

      await sendVivosCallAccept({
        channel: channelRef.current,
        callSessionId: current.callSessionId,
        conversationId,
        fromUserId: userId,
        toUserId: current.remoteUserId,
        callType: current.callType,
      })

      setCallState((state) => setCallStatus(state, "connecting", "Accept trimis, aștept offer"))
      return true
    } catch (error) {
      console.warn("V2 acceptCall failed", error)
      const message = error instanceof Error ? error.message : String(error)
      await cleanupMediaAndPeer()
      setCallState((state) => failCallState(state, message))
      return false
    }
  }, [cleanupMediaAndPeer, conversationId, markActiveCallSession, prepareLocalPeer, userId])

  const rejectCall = useCallback(async () => {
    if (!userId || !conversationId) return

    const current = currentCallRef.current

    if (current.callSessionId && current.remoteUserId) {
      await sendVivosCallReject({
        channel: channelRef.current,
        callSessionId: current.callSessionId,
        conversationId,
        fromUserId: userId,
        toUserId: current.remoteUserId,
        callType: current.callType,
      })

      void notifyCancelForCurrentCall(current)
    }

    await cleanupMediaAndPeer()
    await cancelVivosCallV2IncomingNotification()
    setCallState((state) => setCallStatus(state, "rejected", "Apel respins"))
  }, [cleanupMediaAndPeer, conversationId, notifyCancelForCurrentCall, userId])

  useEffect(() => {
    if (!conversationId || !userId) return

    const pending = consumePendingVivosCallFromNotification(conversationId)
    if (!pending) return

    const { call, action } = pending

    currentCallRef.current = {
      callSessionId: call.callSessionId,
      callType: call.callType,
      remoteUserId: call.fromUserId,
    }
    markActiveCallSession(call.callSessionId)

    setCallState(
      startIncomingCallState({
        callSessionId: call.callSessionId,
        conversationId: call.conversationId,
        remoteUserId: call.fromUserId,
        callType: call.callType,
      })
    )

    if (action === "accept") {
      setTimeout(() => {
        void acceptCall()
      }, 250)
    }

    if (action === "reject") {
      setTimeout(() => {
        void rejectCall()
      }, 250)
    }
  }, [acceptCall, conversationId, markActiveCallSession, rejectCall, userId])

  const endCall = useCallback(async () => {
    if (!userId || !conversationId) return

    const current = currentCallRef.current

    if (current.callSessionId && current.remoteUserId) {
      await sendVivosCallEnd({
        channel: channelRef.current,
        callSessionId: current.callSessionId,
        conversationId,
        fromUserId: userId,
        toUserId: current.remoteUserId,
        callType: current.callType,
      })

      void notifyCancelForCurrentCall(current)
    }

    await cleanupMediaAndPeer()
    await cancelVivosCallV2IncomingNotification()
    setCallState((state) => endCallState(state, "Apel închis"))
  }, [cleanupMediaAndPeer, conversationId, notifyCancelForCurrentCall, userId])

  const toggleMicrophone = useCallback(() => {
    const media = getMediaSnapshot()
    const next = !media.microphoneEnabled
    const applied = setMicrophoneEnabled(next)

    setCallState((state) => ({
      ...state,
      microphoneEnabled: applied,
    }))

    refreshSnapshots()
    return applied
  }, [refreshSnapshots])

  const toggleCamera = useCallback(async () => {
    const media = getMediaSnapshot()
    const next = !media.cameraEnabled
    const applied = await setCameraEnabled(next)

    setCallState((state) => ({
      ...state,
      cameraEnabled: applied,
    }))

    refreshSnapshots()
    return applied
  }, [refreshSnapshots])

  const switchLocalCamera = useCallback(async () => {
    const switched = await switchCamera()
    refreshSnapshots()
    return switched
  }, [refreshSnapshots])

  const toggleSpeaker = useCallback(async () => {
    const audioRoute = await toggleVivosSpeaker()

    setCallState((state) => ({
      ...state,
      speakerEnabled: audioRoute.speakerEnabled,
      diagnostics: [...state.diagnostics.slice(-14), ...audioRoute.diagnostics.slice(-4)].slice(-18),
    }))

    return audioRoute.speakerEnabled
  }, [])

  const reset = useCallback(async () => {
    await cleanupMediaAndPeer()
    await cancelVivosCallV2IncomingNotification()
    setCallState(createIdleCallState())
  }, [cleanupMediaAndPeer])

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    reset,
    toggleMicrophone,
    toggleCamera,
    switchLocalCamera,
    toggleSpeaker,
    refreshSnapshots,
  }
}
