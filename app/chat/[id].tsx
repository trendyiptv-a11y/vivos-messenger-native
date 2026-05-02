import { useEffect, useRef, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader, HeaderIconButton } from "@/components/ui/ScreenHeader"
import { CallOverlay } from "@/components/messenger/CallOverlay"
import { ChatInputBar } from "@/components/messenger/ChatInputBar"
import { MessageBubbleList } from "@/components/messenger/MessageBubbleList"
import { useChatCallFlow } from "@/hooks/useChatCallFlow"
import { useChatConversation } from "@/hooks/useChatConversation"
import { useIncomingCallChannel } from "@/hooks/useIncomingCallChannel"
import { logCallEvent } from "@/lib/calls/signaling"
import {
  addRemoteIceCandidate,
  applyRemoteDescription,
  closeWebRtcManager,
  createLocalAnswer,
  createLocalOffer,
  createWebRtcManager,
  getWebRtcManagerState,
  markWebRtcConnected,
  prepareWebRtcLocalStream,
} from "@/lib/calls/webrtc"
import { buildWebRtcSignalPayload, sendAnswerSignal, sendIceCandidateSignal, sendOfferSignal } from "@/lib/calls/webrtcSignaling"
import { theme } from "@/lib/theme"
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

export default function ChatScreenIntegrated() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const conversationId = String(params.id || "")
  const callChannelRef = useRef<RealtimeChannel | null>(null)

  const {
    scrollRef,
    loading,
    sending,
    userId,
    messages,
    body,
    setBody,
    otherMember,
    otherName,
    handleSend,
  } = useChatConversation(conversationId)

  const [menuOpen, setMenuOpen] = useState(false)

  const {
    callUiState,
    currentCallType,
    callBusy,
    currentCallSessionId,
    incomingCall,
    webrtcStatus,
    mediaReady,
    startMedia,
    setIncomingCall,
    setCurrentCallSessionId,
    setCurrentCallType,
    setCallUiState,
    setWebrtcStatus,
    startOutgoingCall,
    resetCallFlow,
  } = useChatCallFlow({
    conversationId,
    userId,
    calleeId: otherMember?.member_id ?? null,
    callChannelRef,
  })

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
  }, [conversationId, currentCallSessionId, resetCallFlow, setCallUiState, setCurrentCallType, setIncomingCall, setWebrtcStatus, startMedia, userId])

  useIncomingCallChannel({
    userId,
    onIncomingCall: (call) => {
      if (call.conversationId !== conversationId) return
      setIncomingCall(call)
      setCurrentCallSessionId(call.callSessionId)
      setCurrentCallType(call.callType)
      setWebrtcStatus("În așteptare")
      setCallUiState("incoming")
    },
    onCallEnded: async (callSessionId) => {
      if (currentCallSessionId && callSessionId !== currentCallSessionId) return
      await resetCallFlow("Închis")
    },
  })

  useEffect(() => {
    return () => {
      resetCallFlow("Închis")
    }
  }, [resetCallFlow])

  async function handleStartCall(callType: CallType) {
    const session = await startOutgoingCall(callType)
    if (!session || !userId) return

    const signalBase = buildWebRtcSignalPayload({
      callSessionId: session.id,
      conversationId,
      fromUserId: userId,
      callType,
    })

    await sendIceCandidateSignal(callChannelRef.current, {
      ...signalBase,
      candidate: { candidate: "TODO_NATIVE_ICE_CANDIDATE", sdpMid: "0", sdpMLineIndex: 0 },
    })
  }

  async function handleAcceptCall() {
    if (!incomingCall?.callSessionId || !userId) return

    try {
      await startMedia(incomingCall.callType)
      await createWebRtcManager(incomingCall.callType)
      await prepareWebRtcLocalStream()
      await supabase
        .from("call_sessions")
        .update({
          status: "accepted",
          answered_at: new Date().toISOString(),
          call_type: incomingCall.callType,
        })
        .eq("id", incomingCall.callSessionId)

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
    } catch (error) {
      console.error("Accept call error", error)
      await resetCallFlow("Eroare la acceptare")
    }
  }

  async function handleRejectCall() {
    if (!incomingCall?.callSessionId || !userId) return

    try {
      await supabase
        .from("call_sessions")
        .update({ status: "rejected", ended_at: new Date().toISOString() })
        .eq("id", incomingCall.callSessionId)

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
      console.error("Reject call error", error)
    } finally {
      await resetCallFlow("Respins")
    }
  }

  async function handleEndCall() {
    if (!currentCallSessionId || !userId) {
      await resetCallFlow("Închis")
      return
    }

    try {
      await logCallEvent({
        callSessionId: currentCallSessionId,
        actorId: userId,
        eventType: "end",
        payload: { conversationId, callType: currentCallType },
      })

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
    } catch (error) {
      console.error("End call error", error)
    } finally {
      await resetCallFlow("Închis")
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  const currentWebRtcState = getWebRtcManagerState()

  return (
    <AppShell padded={false}>
      <ScreenHeader
        title={otherName}
        left={
          <HeaderIconButton onPress={() => router.push("/inbox")}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </HeaderIconButton>
        }
        right={
          <View style={styles.headerRight}>
            <HeaderIconButton onPress={() => handleStartCall("audio")}>
              <Ionicons name="call-outline" size={19} color={theme.colors.text} />
            </HeaderIconButton>
            <HeaderIconButton onPress={() => handleStartCall("video")}>
              <Ionicons name="videocam-outline" size={19} color={theme.colors.text} />
            </HeaderIconButton>
            <View>
              <HeaderIconButton onPress={() => setMenuOpen((prev) => !prev)}>
                <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.text} />
              </HeaderIconButton>
              {menuOpen ? (
                <View style={styles.menu}>
                  <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); router.push("/inbox") }}><Text style={styles.menuText}>Mesaje</Text></Pressable>
                  <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); router.push("/calls") }}><Text style={styles.menuText}>Apeluri</Text></Pressable>
                  <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); router.push("/profile") }}><Text style={styles.menuText}>Profil</Text></Pressable>
                  <View style={styles.menuDivider} />
                  <Pressable style={styles.menuItem} onPress={handleLogout}><Text style={styles.menuLogout}>Logout</Text></Pressable>
                </View>
              ) : null}
            </View>
          </View>
        }
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <MessageBubbleList scrollRef={scrollRef} loading={loading} messages={messages} userId={userId} />
        <ChatInputBar value={body} onChangeText={setBody} onSend={handleSend} sending={sending} />
      </KeyboardAvoidingView>

      <CallOverlay
        visible={callUiState !== "idle"}
        otherName={otherName}
        callUiState={callUiState}
        currentCallType={currentCallType}
        mediaReady={mediaReady}
        webrtcStatus={webrtcStatus}
        currentWebRtcState={currentWebRtcState}
        callBusy={callBusy}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEnd={handleEndCall}
      />
    </AppShell>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menu: {
    position: "absolute",
    top: 46,
    right: 0,
    width: 180,
    borderRadius: 18,
    padding: 8,
    backgroundColor: "rgba(18,46,84,0.98)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 20,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  menuText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  menuLogout: {
    color: "#FCA5A5",
    fontSize: 15,
    fontWeight: "700",
  },
})
