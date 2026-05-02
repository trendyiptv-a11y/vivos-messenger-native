import { useEffect, useMemo, useRef, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader, HeaderIconButton } from "@/components/ui/ScreenHeader"
import { supabase } from "@/lib/supabase"
import { gradientTextSeed, theme } from "@/lib/theme"

type MessageRow = {
  id: string
  sender_id: string
  body: string
  created_at: string
}

type MemberRow = {
  member_id: string
  name: string | null
  alias: string | null
  email: string | null
}

function formatDay(dateString: string) {
  return new Date(dateString).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ChatScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const conversationId = String(params.id || "")
  const scrollRef = useRef<ScrollView | null>(null)

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [body, setBody] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function loadConversation() {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/login")
        return
      }

      setUserId(session.user.id)

      const [{ data: messageData }, { data: memberData }] = await Promise.all([
        supabase
          .from("messages")
          .select("id, sender_id, body, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
        supabase.rpc("get_conversation_members_with_profiles", {
          p_conversation_id: conversationId,
        }),
      ])

      setMessages((messageData ?? []) as MessageRow[])
      setMembers(
        ((memberData ?? []) as any[]).map((item) => ({
          member_id: item.member_id,
          name: item.name ?? null,
          alias: item.alias ?? null,
          email: item.email ?? null,
        }))
      )
      setLoading(false)
    }

    if (conversationId) {
      loadConversation()
    }
  }, [conversationId, router])

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as MessageRow
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === incoming.id)) return prev
            return [...prev, incoming]
          })
          requestAnimationFrame(() => {
            scrollRef.current?.scrollToEnd({ animated: true })
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    if (!messages.length) return
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80)
    return () => clearTimeout(t)
  }, [messages.length])

  const otherMember = useMemo(() => members.find((member) => member.member_id !== userId) || null, [members, userId])
  const otherName = otherMember?.name?.trim() || otherMember?.alias?.trim() || otherMember?.email?.trim() || "Membru"

  async function handleSend() {
    if (!body.trim() || !userId || sending) return
    setSending(true)

    const text = body.trim()
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: text,
    })

    if (!error) {
      setBody("")
    }

    setSending(false)
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
          <HeaderIconButton onPress={() => router.push("/inbox")}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </HeaderIconButton>
        }
        right={
          <View style={styles.headerRight}>
            <HeaderIconButton onPress={() => {}}>
              <Ionicons name="call-outline" size={19} color={theme.colors.text} />
            </HeaderIconButton>
            <HeaderIconButton onPress={() => {}}>
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
        <ScrollView ref={scrollRef} contentContainerStyle={styles.messagesWrap}>
          {loading ? (
            <Text style={styles.helper}>Se încarcă conversația...</Text>
          ) : messages.length === 0 ? (
            <Text style={styles.helper}>Nu există încă mesaje în această conversație.</Text>
          ) : (
            messages.map((msg, index) => {
              const mine = msg.sender_id === userId
              const prev = messages[index - 1]
              const showDate = !prev || formatDay(prev.created_at) !== formatDay(msg.created_at)
              return (
                <View key={msg.id}>
                  {showDate ? (
                    <View style={styles.dayRow}>
                      <View style={styles.dayLine} />
                      <Text style={styles.dayText}>{formatDay(msg.created_at)}</Text>
                      <View style={styles.dayLine} />
                    </View>
                  ) : null}
                  <View style={[styles.bubbleRow, mine ? styles.bubbleRight : styles.bubbleLeft]}>
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                      <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>{msg.body}</Text>
                      <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeOther]}>{formatTime(msg.created_at)}</Text>
                    </View>
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Scrie un mesaj..."
            placeholderTextColor={theme.colors.textDim}
            style={styles.input}
            multiline
          />
          <Pressable onPress={handleSend} disabled={sending || !body.trim()} style={[styles.sendButton, (!body.trim() || sending) && styles.sendButtonDisabled]}>
            <Ionicons name="send-outline" size={20} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  messagesWrap: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  helper: {
    textAlign: "center",
    color: theme.colors.textSoft,
    fontSize: 15,
    paddingVertical: 24,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dayText: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontWeight: "700",
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleLeft: {
    justifyContent: "flex-start",
  },
  bubbleRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: "rgba(201,106,161,0.88)",
  },
  bubbleOther: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextMine: {
    color: "white",
  },
  bubbleTextOther: {
    color: theme.colors.text,
  },
  bubbleTime: {
    alignSelf: "flex-end",
    marginTop: 6,
    fontSize: 11,
  },
  bubbleTimeMine: {
    color: "rgba(255,255,255,0.78)",
  },
  bubbleTimeOther: {
    color: theme.colors.textDim,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: "rgba(18,46,84,0.96)",
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
    color: theme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accentMid,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
})
