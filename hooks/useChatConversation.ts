import { useEffect, useMemo, useRef, useState } from "react"
import { ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { sendMessagePush } from "@/lib/push"
import {
  attachmentBodyLabel,
  pickChatFile,
  pickChatPhoto,
  pickChatVideo,
  PickedChatAttachment,
  uploadChatAttachment,
} from "@/lib/chatAttachments"

type MessageRow = {
  id: string
  sender_id: string
  body: string
  created_at: string
  attachment_url?: string | null
  attachment_type?: string | null
  attachment_name?: string | null
  attachment_size?: number | null
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

const MESSAGE_SELECT = "id, sender_id, body, created_at, attachment_url, attachment_type, attachment_name, attachment_size"

export function useChatConversation(conversationId: string) {
  const router = useRouter()
  const scrollRef = useRef<ScrollView | null>(null)
  const mountedRef = useRef(true)

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [body, setBody] = useState("")
  const bodyRef = useRef("")

  function updateBody(text: string) {
    bodyRef.current = text
    setBody(text)
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadConversation() {
      try {
        if (!cancelled && mountedRef.current) setLoading(true)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (cancelled || !mountedRef.current) return

        if (!session?.user) {
          router.replace("/login")
          return
        }

        setUserId(session.user.id)

        const [{ data: messageData }, { data: memberData }] = await Promise.all([
          supabase
            .from("messages")
            .select(MESSAGE_SELECT)
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true }),
          supabase.rpc("get_conversation_members_with_profiles", {
            p_conversation_id: conversationId,
          }),
        ])

        if (cancelled || !mountedRef.current) return

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
      } catch (error) {
        console.warn("loadConversation failed", error)
        if (!cancelled && mountedRef.current) setLoading(false)
      }
    }

    if (conversationId) {
      loadConversation()
    }

    return () => {
      cancelled = true
    }
  }, [conversationId, router])

  useEffect(() => {
    let cancelled = false

    async function markConversationNotificationsRead() {
      try {
        if (!userId || !conversationId) return

        const { data: unreadNotifications } = await supabase
          .from("notifications")
          .select("id, ref_id")
          .eq("event_type", "new_message")
          .eq("is_read", false)
          .eq("user_id", userId)

        if (cancelled || !mountedRef.current) return

        const messageIds = ((unreadNotifications ?? []) as NotificationRefRow[])
          .map((item) => item.ref_id)
          .filter((value): value is string => !!value)

        if (!messageIds.length) return

        const { data: messageRows } = await supabase
          .from("messages")
          .select("id, conversation_id")
          .in("id", messageIds)
          .eq("conversation_id", conversationId)

        if (cancelled || !mountedRef.current) return

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
      } catch (error) {
        console.warn("markConversationNotificationsRead failed", error)
      }
    }

    markConversationNotificationsRead()

    return () => {
      cancelled = true
    }
  }, [conversationId, userId, messages.length])

  useEffect(() => {
    if (!conversationId) return
    let active = true

    const messageChannel = supabase
      .channel(`chat-${conversationId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (!active || !mountedRef.current) return
          const incoming = payload.new as MessageRow
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === incoming.id)) return prev
            return [...prev, incoming]
          })
          requestAnimationFrame(() => {
            if (active && mountedRef.current) {
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          })
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(messageChannel).catch((error) => {
        console.warn("chat channel cleanup failed", error)
      })
    }
  }, [conversationId])

  useEffect(() => {
    if (!messages.length) return
    const timer = setTimeout(() => {
      if (mountedRef.current) scrollRef.current?.scrollToEnd({ animated: false })
    }, 80)
    return () => clearTimeout(timer)
  }, [messages.length])

  const otherMember = useMemo(() => members.find((member) => member.member_id !== userId) || null, [members, userId])
  const selfMember = useMemo(() => members.find((member) => member.member_id === userId) || null, [members, userId])
  const otherName = otherMember?.name?.trim() || otherMember?.alias?.trim() || otherMember?.email?.trim() || "Membru"
  const selfName = selfMember?.name?.trim() || selfMember?.alias?.trim() || selfMember?.email?.trim() || "VIVOS"

  async function insertMessage(text: string, attachment?: {
    attachment_url: string
    attachment_type: string
    attachment_name: string
    attachment_size: number | null
  }) {
    if (!userId) return null

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: text,
        ...(attachment ?? {}),
      })
      .select("id")
      .single()

    if (error) throw error
    return data?.id as string | undefined
  }

  async function handleSend() {
    const text = bodyRef.current.trim()
    if (!text || !userId || sending || attaching) return
    setSending(true)

    try {
      const messageId = await insertMessage(text)

      if (mountedRef.current) {
        bodyRef.current = ""
        setBody("")
      }

      if (otherMember?.member_id) {
        sendMessagePush({
          targetUserId: otherMember.member_id,
          conversationId,
          senderName: selfName,
          message: text,
          messageId,
        })
      }
    } catch (error) {
      console.warn("send message failed", error)
    } finally {
      if (mountedRef.current) setSending(false)
    }
  }

  async function sendAttachment(picker: () => Promise<PickedChatAttachment | null>) {
    if (!userId || !conversationId || sending || attaching) return
    setAttaching(true)

    try {
      const picked = await picker()
      if (!picked) return

      const uploaded = await uploadChatAttachment(conversationId, userId, picked)
      const text = attachmentBodyLabel(uploaded.kind, uploaded.name)
      const messageId = await insertMessage(text, {
        attachment_url: uploaded.publicUrl,
        attachment_type: uploaded.kind,
        attachment_name: uploaded.name,
        attachment_size: uploaded.size,
      })

      if (otherMember?.member_id) {
        sendMessagePush({
          targetUserId: otherMember.member_id,
          conversationId,
          senderName: selfName,
          message: text,
          messageId,
        })
      }
    } catch (error) {
      console.warn("send attachment failed", error)
    } finally {
      if (mountedRef.current) setAttaching(false)
    }
  }

  return {
    scrollRef,
    loading,
    sending,
    attaching,
    userId,
    messages,
    members,
    body,
    setBody: updateBody,
    otherMember,
    otherName,
    selfName,
    handleSend,
    handlePickPhoto: () => sendAttachment(pickChatPhoto),
    handlePickVideo: () => sendAttachment(pickChatVideo),
    handlePickFile: () => sendAttachment(pickChatFile),
  }
}
