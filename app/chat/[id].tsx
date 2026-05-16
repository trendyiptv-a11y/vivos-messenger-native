import { useEffect, useMemo, useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, ScrollView, Text, View } from "react-native"
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

  function startCallWithPresenceCheck(callType: "audio" | "video") {
    const shouldWarn = otherPresence?.status !== "connected"

    if (!shouldWarn) {
      void startCall(callType)
      return
    }

    Alert.alert(
      "Membrul pare neconectat",
      "Poți încerca apelul, dar este posibil să nu răspundă imediat. Poți trimite și un mesaj.",
      [
        { text: "Renunță", style: "cancel" },
        { text: "Sună oricum", onPress: () => void startCall(callType) },
      ]
    )
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
              onStartAudio={() => startCallWithPresenceCheck("audio")}
              onStartVideo={() => startCallWithPresenceCheck("video")}
              onLogout={handleLogout}
              onOpenMessages={handleBackToInbox}
            />
          }
        />

        {otherPresence ? (
          <View style={styles.presenceRow}>
            <PresencePill presence={otherPresence} />
            {otherPresence.status !== "connected" ? (
              <Text style={styles.presenceHint}>Apelul poate rămâne fără răspuns dacă membrul nu este conectat.</Text>
            ) : null}
          </View>
        ) : null}

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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  messagesWrap: {
    flex: 1,
    minHeight: 320,
  },
})