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
import { VivosCallV2Panel } from "@/components/calls-v2/VivosCallV2Panel"
import { useChatConversation } from "@/hooks/useChatConversation"
import { theme } from "@/lib/theme"

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
    handleSend,
  } = useChatConversation(conversationId)

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
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <AppShell padded={false}>
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
          <VivosCallV2Panel
            conversationId={conversationId}
            userId={userId}
            remoteUserId={otherMember?.member_id ?? null}
            remoteName={otherName}
          />

          <View style={styles.messagesWrap}>
            <MessageBubbleList scrollRef={scrollRef} loading={loading} messages={messages} userId={userId} />
          </View>
        </ScrollView>

        <ChatInputBar value={body} onChangeText={setBody} onSend={handleSend} sending={sending} />
      </KeyboardAvoidingView>
    </AppShell>
  )
}

const styles = StyleSheet.create({
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
