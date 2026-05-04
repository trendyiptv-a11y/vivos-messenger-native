import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { BottomTabBar } from "@/components/ui/BottomTabBar"
import { supabase } from "@/lib/supabase"
import { t } from "@/lib/i18n"
import { gradientTextSeed, theme } from "@/lib/theme"

type ConversationRow = { id: string; created_at: string }
type MemberRow = { member_id: string; name: string | null; alias: string | null; email: string | null }
type MemberGroup = { conversation_id: string; members: MemberRow[] }
type MessageRow = { id?: string; conversation_id: string; body: string; created_at: string }
type NotificationRefRow = { id: string; ref_id: string | null }

type ConvCard = {
  id: string
  name: string
  email: string | null
  preview: string
  date: string
  unreadCount: number
}

export default function InboxScreen() {
  const router = useRouter()
  const mountedRef = useRef(true)
  const loadBusyRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [members, setMembers] = useState<MemberGroup[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({})

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    if (loadBusyRef.current) return
    loadBusyRef.current = true

    try {
      if (mountedRef.current) setLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mountedRef.current) return

      if (!session?.user) {
        router.replace("/login")
        return
      }

      setUserId(session.user.id)

      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(50)

      if (convError) throw convError
      if (!mountedRef.current) return

      const convs = (convData ?? []) as ConversationRow[]
      const ids = convs.map((c) => c.id).filter(Boolean)

      if (!ids.length) {
        setConversations([])
        setMembers([])
        setMessages([])
        setUnreadByConv({})
        return
      }

      const memberGroups = await Promise.all(
        ids.map(async (cid) => {
          const { data } = await supabase.rpc("get_conversation_members_with_profiles", {
            p_conversation_id: cid,
          })
          return {
            conversation_id: cid,
            members: ((data ?? []) as any[]).map((item) => ({
              member_id: item.member_id,
              name: item.name ?? null,
              alias: item.alias ?? null,
              email: item.email ?? null,
            })),
          } as MemberGroup
        })
      )

      if (!mountedRef.current) return

      const [{ data: msgData }, { data: unreadNotifications }] = await Promise.all([
        supabase
          .from("messages")
          .select("id, conversation_id, body, created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false }),
        supabase
          .from("notifications")
          .select("id, ref_id")
          .eq("event_type", "new_message")
          .eq("is_read", false)
          .eq("user_id", session.user.id),
      ])

      if (!mountedRef.current) return

      const unreadMessageIds = ((unreadNotifications ?? []) as NotificationRefRow[])
        .map((item) => item.ref_id)
        .filter((value): value is string => !!value)

      const unreadMap: Record<string, number> = {}
      if (unreadMessageIds.length) {
        const { data: unreadMessages } = await supabase
          .from("messages")
          .select("id, conversation_id")
          .in("id", unreadMessageIds)

        if (!mountedRef.current) return

        ;((unreadMessages ?? []) as any[]).forEach((row) => {
          const cid = String(row.conversation_id || "")
          if (!cid) return
          unreadMap[cid] = (unreadMap[cid] ?? 0) + 1
        })
      }

      setConversations(convs)
      setMembers(memberGroups)
      setMessages((msgData ?? []) as MessageRow[])
      setUnreadByConv(unreadMap)
    } catch (error) {
      console.warn("Inbox load failed", error)
    } finally {
      loadBusyRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }, [router])

  useEffect(() => {
    let active = true
    load()

    const channel = supabase
      .channel("native-inbox-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        if (active && mountedRef.current) load()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        if (active && mountedRef.current) load()
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel).catch((error) => {
        console.warn("inbox channel cleanup failed", error)
      })
    }
  }, [load])

  const cards = useMemo<ConvCard[]>(() => {
    return conversations
      .map((conv) => {
        const group = members.find((g) => g.conversation_id === conv.id)
        const other = group?.members.find((m) => m.member_id !== userId) ?? null
        const latest = messages.find((m) => m.conversation_id === conv.id)
        return {
          id: conv.id,
          name: other?.name?.trim() || other?.alias?.trim() || other?.email?.trim() || "Membru",
          email: other?.email?.trim() || null,
          preview: latest?.body || "Fără mesaje",
          date: latest?.created_at || conv.created_at,
          unreadCount: unreadByConv[conv.id] ?? 0,
        }
      })
      .sort((a, b) => {
        const aUnread = a.unreadCount > 0
        const bUnread = b.unreadCount > 0
        if (aUnread !== bUnread) return aUnread ? -1 : 1
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
  }, [conversations, members, messages, unreadByConv, userId])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return cards
    return cards.filter((card) => [card.name, card.email || "", card.preview].some((v) => v.toLowerCase().includes(term)))
  }, [cards, search])

  function openChat(conversationId: string) {
    router.push(`/chat/${conversationId}`)
  }

  return (
    <AppShell padded={false}>
      <ScreenHeader eyebrow="VIVOS" title="Messenger" />
      <View style={styles.content}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.textDim} />
          <TextInput value={search} onChangeText={setSearch} placeholder={t("searchConversations")} placeholderTextColor={theme.colors.textDim} style={styles.searchInput} />
        </View>

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <Text style={styles.helper}>{t("loadingConversations")}</Text>
          ) : filtered.length === 0 ? (
            <Text style={styles.helper}>{t("noConversations")}</Text>
          ) : (
            filtered.map((card) => (
              <Pressable key={card.id} onPress={() => openChat(card.id)} style={({ pressed }) => [styles.convCard, card.unreadCount > 0 && styles.convCardUnread, pressed && styles.cardPressed]}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{gradientTextSeed(card.email || card.name)}</Text>
                </View>
                <View style={styles.convBody}>
                  <View style={styles.convTop}>
                    <Text numberOfLines={1} style={[styles.convName, card.unreadCount > 0 && styles.convNameUnread]}>{card.name}</Text>
                    <Text style={styles.convDate}>{new Date(card.date).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text numberOfLines={1} style={[styles.convPreview, card.unreadCount > 0 && styles.convPreviewUnread]}>{card.preview}</Text>
                    {card.unreadCount > 0 ? (
                      <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{card.unreadCount > 99 ? "99+" : card.unreadCount}</Text></View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
      <BottomTabBar />
    </AppShell>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 14,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 22,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    minHeight: 50,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  helper: {
    color: theme.colors.textSoft,
    textAlign: "center",
    paddingVertical: 28,
    fontSize: 15,
  },
  convCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    borderRadius: 24,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  cardPressed: {
    opacity: 0.78,
  },
  convCardUnread: {
    backgroundColor: "rgba(255,255,255,0.105)",
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(154,113,193,0.62)",
  },
  avatarText: {
    color: "white",
    fontSize: 19,
    fontWeight: "900",
  },
  convBody: {
    flex: 1,
    gap: 6,
  },
  convTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  convName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  convNameUnread: {
    fontWeight: "900",
  },
  convDate: {
    color: theme.colors.textDim,
    fontSize: 13,
    fontWeight: "700",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  convPreview: {
    flex: 1,
    color: theme.colors.textSoft,
    fontSize: 14,
  },
  convPreviewUnread: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accentMid,
  },
  unreadBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "900",
  },
})
