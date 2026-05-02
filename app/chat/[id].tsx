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
import { useChatCallSignaling } from "@/hooks/useChatCallSignaling"
import { useChatConversation } from "@/hooks/useChatConversation"
import { useIncomingCallChannel } from "@/hooks/useIncomingCallChannel"
import { getWebRtcManagerState } from "@/lib/calls/webrtc"
import { buildWebRtcSignalPayload, sendIceCandidateSignal } from "@/lib/calls/webrtcSignaling"
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
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
        onEnd={stopCurrentCall}
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
