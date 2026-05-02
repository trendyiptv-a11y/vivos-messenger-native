import { useEffect, useMemo, useRef, useState } from "react"
import { ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"

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

export function useChatConversation(conversationId: string) {
  const router = useRouter()
  const scrollRef = useRef<ScrollView | null>(null)

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [body, setBody] = useState("")

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

    return () => {
      supabase.removeChannel(messageChannel)
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

  return {
    scrollRef,
    loading,
    sending,
    userId,
    messages,
    members,
    body,
    setBody,
    otherMember,
    otherName,
    handleSend,
  }
}
