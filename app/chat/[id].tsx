import { useEffect, useRef, useState } from "react"
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader, HeaderIconButton } from "@/components/ui/ScreenHeader"
import { CallOverlay } from "@/components/messenger/CallOverlay"
import { ChatHeaderActions } from "@/components/messenger/ChatHeaderActions"
import { ChatInputBar } from "@/components/messenger/ChatInputBar"
import { MessageBubbleList } from "@/components/messenger/MessageBubbleList"
import { useChatCallFlow } from "@/hooks/useChatCallFlow"
import { useChatCallSignaling } from "@/hooks/useChatCallSignaling"
import { useChatConversation } from "@/hooks/useChatConversation"
import { useIncomingCallChannel } from "@/hooks/useIncomingCallChannel"
import { buildWebRtcSignalPayload, sendIceCandidateSignal } from "@/lib/calls/webrtcSignaling"
import { getWebRtcManagerState } from "@/lib/calls/webrtc"
import { theme } from "@/lib/theme"
import { CallType } from "@/types/call"

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
    webrtcStatus,
    mediaReady,
    startMedia,
    setIncomingCall,
    setCurrentCallSessionId,
    setCurrentCallType,
    setCallUiState,
    setWebrtcStatus,
    startOutgoingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    stopCurrentCall,
    resetCallFlow,
  } = useChatCallFlow({
    conversationId,
    userId,
    calleeId: otherMember?.member_id ?? null,
    callChannelRef,
  })

  useChatCallSignaling({
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
  })

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
          <ChatHeaderActions
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            onStartCall={handleStartCall}
            onLogout={handleLogout}
          />
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
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
        onEnd={stopCurrentCall}
      />
    </AppShell>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
