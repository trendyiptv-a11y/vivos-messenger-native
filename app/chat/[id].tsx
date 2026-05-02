import { useEffect, useMemo, useRef, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { RealtimeChannel } from "@supabase/supabase-js"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader, HeaderIconButton } from "@/components/ui/ScreenHeader"
import { useCallMedia } from "@/hooks/useCallMedia"
import { useIncomingCallChannel } from "@/hooks/useIncomingCallChannel"
import { createOutgoingCallSession, endCallSession, logCallEvent } from "@/lib/calls/signaling"
import { supabase } from "@/lib/supabase"
import { theme } from "@/lib/theme"
import { CallType, CallUiState, IncomingCall } from "@/types/call"

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

type NotificationRefRow = {
  id: string
  ref_id: string | null
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
  const callChannelRef = useRef<RealtimeChannel | null>(null)

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [body, setBody] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [callUiState, setCallUiState] = useState<CallUiState>("idle")
  const [currentCallType, setCurrentCallType] = useState<CallType>("audio")
  const [callBusy, setCallBusy] = useState(false)
  const [currentCallSessionId, setCurrentCallSessionId] = useState<string | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)

  const { mediaReady, startMedia, stopMedia } = useCallMedia()

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
    async function markConversationNotificationsRead() {
      if (!userId || !conversationId) return

      const { data: unreadNotifications } = await supabase
        .from("notifications")
        .select("id, ref_id")
        .eq("event_type", "new_message")
        .eq("is_read", false)
        .eq("user_id", userId)

      const messageIds = ((unreadNotifications ?? []) as NotificationRefRow[])
        .map((item) => item.ref_id)
        .filter((value): value is string => !!value)

      if (!messageIds.length) return

      const { data: messageRows } = await supabase
        .from("messages")
        .select("id, conversation_id")
        .in("id", messageIds)
        .eq("conversation_id", conversationId)

      const targetMessageIds = new Set(((messageRows ?? []) as any[]).map((row) => row.id))
      if (!targetMessageIds.size) return

      const notificationIdsToMark = ((unreadNotifications ?? []) as NotificationRefRow[])
        .filter((item) => item.ref_id && targetMessageIds.has(item.ref_id))
        .map((item) => item.id)

      if (!notificationIdsToMark.length) return

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", notificationIdsToMark)
    }

    markConversationNotificationsRead()
  }, [conversationId, userId, messages.length])

  useEffect(() => {
    if (!conversationId) return

    const messageChannel = supabase
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

    const callChannel = supabase
      .channel(`call:conversation:${conversationId}`)
      .on("broadcast", { event: "call_accept" }, async ({ payload }) => {
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId) return
        await startMedia(payload.callType === "video" ? "video" : "audio")
        setIncomingCall(null)
        setCallUiState("connected")
      })
      .on("broadcast", { event: "call_reject" }, async ({ payload }) => {
        if (!payload?.callSessionId || payload.callSessionId !== currentCallSessionId) return
        await stopMedia()
        setIncomingCall(null)
        setCurrentCallSessionId(null)
        setCallUiState("idle")
      })
      .on("broadcast", { event: "call_end" }, async ({ payload }) => {
        if (!payload?.callSessionId) return
        if (currentCallSessionId && payload.callSessionId !== currentCallSessionId) return
        await stopMedia()
        setIncomingCall(null)
        setCurrentCallSessionId(null)
        setCallUiState("idle")
      })
      .subscribe()

    callChannelRef.current = callChannel

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(callChannel)
      callChannelRef.current = null
    }
  }, [conversationId, currentCallSessionId, startMedia, stopMedia])

  useIncomingCallChannel({
    userId,
    onIncomingCall: (call) => {
      if (call.conversationId !== conversationId) return
      setIncomingCall(call)
      setCurrentCallSessionId(call.callSessionId)
      setCurrentCallType(call.callType)
      setCallUiState("incoming")
    },
    onCallEnded: async (callSessionId) => {
      if (currentCallSessionId && callSessionId !== currentCallSessionId) return
      await stopMedia()
      setIncomingCall(null)
      setCurrentCallSessionId(null)
      setCallUiState("idle")
    },
  })

  useEffect(() => {
    if (!messages.length) return
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80)
    return () => clearTimeout(t)
  }, [messages.length])

  useEffect(() => {
    return () => {
      stopMedia()
    }
  }, [stopMedia])

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

  async function handleStartCall(callType: CallType) {
    if (!userId || !otherMember?.member_id || callBusy || callUiState !== "idle") return

    try {
      setCallBusy(true)
      setCurrentCallType(callType)
      await startMedia(callType)

      const session = await createOutgoingCallSession({
        conversationId,
        callerId: userId,
        calleeId: otherMember.member_id,
        callType,
      })

      await logCallEvent({
        callSessionId: session.id,
        actorId: userId,
        eventType: "invite",
        payload: { conversationId, callType },
      })

      await callChannelRef.current?.send({
        type: "broadcast",
        event: "call_invite",
        payload: {
          callSessionId: session.id,
          conversationId,
          fromUserId: userId,
          toUserId: otherMember.member_id,
          callType,
        },
      })

      setCurrentCallSessionId(session.id)
      setCallUiState("outgoing")
    } catch (error) {
      console.error("Start call error", error)
      await stopMedia()
    } finally {
      setCallBusy(false)
    }
  }

  async function handleAcceptCall() {
    if (!incomingCall?.callSessionId || !userId) return

    try {
      setCallBusy(true)
      await startMedia(incomingCall.callType)
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

      setCurrentCallSessionId(incomingCall.callSessionId)
      setCurrentCallType(incomingCall.callType)
      setCallUiState("connected")
      setIncomingCall(null)
    } catch (error) {
      console.error("Accept call error", error)
      await stopMedia()
    } finally {
      setCallBusy(false)
    }
  }

  async function handleRejectCall() {
    if (!incomingCall?.callSessionId || !userId) return

    try {
      setCallBusy(true)
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
      await stopMedia()
      setIncomingCall(null)
      setCurrentCallSessionId(null)
      setCallUiState("idle")
      setCallBusy(false)
    }
  }

  async function handleEndCall() {
    if (!currentCallSessionId || !userId) {
      await stopMedia()
      setIncomingCall(null)
      setCallUiState("idle")
      return
    }

    try {
      setCallBusy(true)
      await endCallSession(currentCallSessionId)
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
      await stopMedia()
      setIncomingCall(null)
      setCurrentCallSessionId(null)
      setCallUiState("idle")
      setCallBusy(false)
    }
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

      {callUiState !== "idle" ? (
        <View style={styles.callOverlay}>
          <View style={styles.callCard}>
            <View style={styles.callAvatarCircle}>
              <Text style={styles.callAvatarText}>{otherName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.callName}>{otherName}</Text>
            <Text style={styles.callStatus}>
              {callUiState === "incoming"
                ? currentCallType === "video"
                  ? "Apel video primit"
                  : "Apel audio primit"
                : callUiState === "outgoing"
                  ? currentCallType === "video"
                    ? "Se apelează video..."
                    : "Se apelează audio..."
                  : currentCallType === "video"
                    ? "Apel video conectat"
                    : "Apel audio conectat"}
            </Text>
            <Text style={styles.callMediaHint}>{mediaReady ? "Media pregătită pentru următorul pas WebRTC" : "Se pregătește media nativă..."}</Text>

            {callUiState === "incoming" ? (
              <View style={styles.callActionsRow}>
                <Pressable onPress={handleAcceptCall} disabled={callBusy} style={[styles.callActionButton, styles.callAcceptButton]}>
                  <Ionicons name="call" size={20} color="white" />
                  <Text style={styles.callActionText}>Răspunde</Text>
                </Pressable>
                <Pressable onPress={handleRejectCall} disabled={callBusy} style={[styles.callActionButton, styles.callRejectButton]}>
                  <Ionicons name="call-outline" size={20} color="white" />
                  <Text style={styles.callActionText}>Respinge</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handleEndCall} disabled={callBusy} style={[styles.callActionButton, styles.callRejectButton, styles.callEndSingle]}>
                <Ionicons name="call-outline" size={20} color="white" />
                <Text style={styles.callActionText}>{callUiState === "connected" ? "Închide apelul" : "Anulează apelul"}</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}
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
  callOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,10,20,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  callCard: {
    width: "100%",
    borderRadius: 30,
    padding: 24,
    backgroundColor: "rgba(18,46,84,0.98)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  callAvatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(154,113,193,0.65)",
  },
  callAvatarText: {
    color: "white",
    fontSize: 30,
    fontWeight: "800",
  },
  callName: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 18,
  },
  callStatus: {
    color: theme.colors.textSoft,
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  callMediaHint: {
    color: theme.colors.textDim,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  callActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    width: "100%",
  },
  callActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 54,
    borderRadius: 20,
    paddingHorizontal: 18,
    flex: 1,
  },
  callAcceptButton: {
    backgroundColor: "#0F9D58",
  },
  callRejectButton: {
    backgroundColor: "#D93025",
  },
  callEndSingle: {
    marginTop: 24,
    width: "100%",
  },
  callActionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
})
