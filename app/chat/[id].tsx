import { useState } from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, ScrollView, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader, HeaderIconButton } from "@/components/ui/ScreenHeader"
import { ChatHeaderActions } from "@/components/messenger/ChatHeaderActions"
import { ChatInputBar } from "@/components/messenger/ChatInputBar"
import { MessageBubbleList } from "@/components/messenger/MessageBubbleList"
import { VivosCallV2Overlay } from "@/components/calls-v2/VivosCallV2Overlay"
import { useChatConversation } from "@/hooks/useChatConversation"
import { useVivosCallV2 } from "@/lib/calls-v2/useVivosCallV2"
import { theme } from "@/lib/theme"
import { unregisterPushToken } from "@/lib/notifications"

export default function ChatScreenIntegrated() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const conversationId = String(params.id || "")

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
    selfName,
    handleSend,
  } = useChatConversation(conversationId)

  const {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    reset,
    toggleMicrophone,
    toggleCamera,
    toggleSpeaker,
    switchLocalCamera,
  } = useVivosCallV2({
    conversationId,
    userId,
    remoteUserId: otherMember?.member_id ?? null,
    remoteName: otherName,
    callerName: selfName,
  })

  const [menuOpen, setMenuOpen] = useState(false)

  function handleBackToInbox() {
    setMenuOpen(false)

    if (router.canGoBack()) {
      router.back()
      return
    }

    router.replace("/inbox")
  }

  async function handleLogout() {
    await unregisterPushToken()
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <AppShell padded={false}>
      <View style={styles.screen}>
        <ScreenHeader
          title={otherName}
          left={
            <HeaderIconButton onPress={handleBackToInbox}>
              <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
            </HeaderIconButton>
          }
          right={
            <ChatHeaderActions
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
              onStartAudio={() => startCall("audio")}
              onStartVideo={() => startCall("video")}
              onLogout={handleLogout}
              onOpenMessages={handleBackToInbox}
            />
          }
        />

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.messagesWrap}>
              <MessageBubbleList scrollRef={scrollRef} loading={loading} messages={messages} userId={userId} />
            </View>
          </ScrollView>

          <ChatInputBar value={body} onChangeText={setBody} onSend={handleSend} sending={sending} />
        </KeyboardAvoidingView>

        <VivosCallV2Overlay
          callState={callState}
          remoteName={otherName}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEnd={endCall}
          onReset={reset}
          onToggleMicrophone={toggleMicrophone}
          onToggleCamera={toggleCamera}
          onToggleSpeaker={toggleSpeaker}
          onSwitchCamera={switchLocalCamera}
        />
      </View>
    </AppShell>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: "relative",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  messagesWrap: {
    flex: 1,
    minHeight: 320,
  },
})
