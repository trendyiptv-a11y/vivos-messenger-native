import { useEffect, useMemo, useState } from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader, HeaderIconButton } from "@/components/ui/ScreenHeader"
import { ChatHeaderActions } from "@/components/messenger/ChatHeaderActions"
import { ChatInputBar } from "@/components/messenger/ChatInputBar"
import { MessageBubbleList } from "@/components/messenger/MessageBubbleList"
import { PresencePill } from "@/components/presence/PresencePill"
import { VivosCallV2Overlay } from "@/components/calls-v2/VivosCallV2Overlay"
import { useChatConversation } from "@/hooks/useChatConversation"
import { useVivosCallV2 } from "@/lib/calls-v2/useVivosCallV2"
import {
  clearActiveVivosCallConversation,
  setActiveVivosCallConversation,
} from "@/lib/calls-v2/activeCallRuntime"
import { fetchPresenceMap, getPresenceInfo, updateOwnPresence, UserPresenceRow } from "@/lib/presence/userPresence"
import { theme } from "@/lib/theme"
import { unregisterPushToken } from "@/lib/notifications"

export default function ChatScreenIntegrated() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const conversationId = String(params.id || "")
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresenceRow>>({})

  const {
    loading,
    sending,
    attaching,
    userId,
    messages,
    body,
    setBody,
    otherMember,
    otherName,
    selfName,
    handleSend,
    handleCapturePhoto,
    handleCaptureVideo,
    handlePickPhoto,
    handlePickVideo,
    handlePickFile,
  } = useChatConversation(conversationId)

  useEffect(() => {
    if (!conversationId) return

    setActiveVivosCallConversation(conversationId)

    return () => {
      clearActiveVivosCallConversation(conversationId)
    }
  }, [conversationId])

  useEffect(() => {
    const otherUserId = otherMember?.member_id
    if (!otherUserId) {
      setPresenceMap({})
      return
    }

    let active = true

    async function loadPresence() {
      const next = await fetchPresenceMap([otherUserId])
      if (active) setPresenceMap(next)
    }

    loadPresence()
    const timer = setInterval(loadPresence, 30 * 1000)

    const channel = supabase
      .channel(`chat-presence:${conversationId}:${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence", filter: `user_id=eq.${otherUserId}` }, () => {
        void loadPresence()
      })

    channel.subscribe()

    return () => {
      active = false
      clearInterval(timer)
      supabase.removeChannel(channel).catch(() => {})
    }
  }, [conversationId, otherMember?.member_id])

  const otherPresence = useMemo(() => {
    const otherUserId = otherMember?.member_id
    return otherUserId ? getPresenceInfo(otherUserId, presenceMap[otherUserId]) : null
  }, [otherMember?.member_id, presenceMap])

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
    selfName,
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
    await updateOwnPresence(userId, "disconnected")
    await unregisterPushToken()
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <AppShell padded={false}>
      <View style={styles.screen}>
        <ScreenHeader
          title={otherName}
          subtitle={otherPresence ? otherPresence.label : undefined}
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

        {otherPresence ? (
          <View style={styles.presenceRow}>
            <PresencePill presence={otherPresence} />
            {otherPresence.status !== "connected" ? (
              <Text style={styles.presenceHint}>Membrul pare neconectat. Poți suna, dar este posibil să nu răspundă imediat.</Text>
            ) : null}
          </View>
        ) : null}

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.messagesWrap}>
            <MessageBubbleList loading={loading} messages={messages} userId={userId} />
          </View>

          <ChatInputBar
            value={body}
            onChangeText={setBody}
            onSend={handleSend}
            onCapturePhoto={handleCapturePhoto}
            onCaptureVideo={handleCaptureVideo}
            onPickPhoto={handlePickPhoto}
            onPickVideo={handlePickVideo}
            onPickFile={handlePickFile}
            sending={sending}
            attaching={attaching}
          />
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
  presenceRow: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 5,
  },
  presenceHint: {
    color: theme.colors.textDim,
    fontSize: 12,
    lineHeight: 16,
  },
  messagesWrap: {
    flex: 1,
    minHeight: 320,
  },
})
