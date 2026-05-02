import { useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { BottomTabBar } from "@/components/ui/BottomTabBar"
import { AppButton } from "@/components/ui/AppButton"
import { supabase } from "@/lib/supabase"
import { gradientTextSeed, theme } from "@/lib/theme"

type ConversationRow = { id: string; created_at: string }
type MemberRow = { member_id: string; name: string | null; alias: string | null; email: string | null }
type MemberGroup = { conversation_id: string; members: MemberRow[] }
type MessageRow = { id?: string; conversation_id: string; body: string; created_at: string }

type ConvCard = {
  id: string
  name: string
  email: string | null
  preview: string
  date: string
}

export default function InboxScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [members, setMembers] = useState<MemberGroup[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/login")
        return
      }

      setUserId(session.user.id)

      const { data: convData } = await supabase
        .from("conversations")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(30)

      const convs = (convData ?? []) as ConversationRow[]
      const ids = convs.map((c) => c.id)

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

      const { data: msgData } = await supabase
        .from("messages")
        .select("id, conversation_id, body, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })

      setConversations(convs)
      setMembers(memberGroups)
      setMessages((msgData ?? []) as MessageRow[])
      setLoading(false)
    }

    load()
  }, [router])

  const cards = useMemo<ConvCard[]>(() => {
    return conversations.map((conv) => {
      const group = members.find((g) => g.conversation_id === conv.id)
      const other = group?.members.find((m) => m.member_id !== userId) ?? null
      const latest = messages.find((m) => m.conversation_id === conv.id)
      return {
        id: conv.id,
        name: other?.name?.trim() || other?.alias?.trim() || other?.email?.trim() || "Membru",
        email: other?.email?.trim() || null,
        preview: latest?.body || "Fără mesaje",
        date: latest?.created_at || conv.created_at,
      }
    })
  }, [conversations, members, messages, userId])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return cards
    return cards.filter((card) => [card.name, card.email || "", card.preview].some((v) => v.toLowerCase().includes(term)))
  }, [cards, search])

  return (
    <AppShell padded={false}>
      <ScreenHeader eyebrow="VIVOS" title="Messenger" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Mesaje private</Text>
          <Text style={styles.heroTitle}>Spațiu direct de legătură</Text>
          <Text style={styles.heroBody}>Mesaje clare, apeluri rapide și contact uman fără zgomot inutil.</Text>
          <AppButton title="Deschide apeluri" onPress={() => router.push("/calls")} leftIcon={<Ionicons name="call-outline" size={18} color="white" />} />

          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statLabel}>Conversații</Text><Text style={styles.statValue}>{cards.length}</Text></View>
            <View style={styles.statCard}><Text style={styles.statLabel}>Rezultate</Text><Text style={styles.statValue}>{filtered.length}</Text></View>
            <View style={styles.statCard}><Text style={styles.statLabel}>Active</Text><Text style={styles.statValue}>{Math.min(filtered.length, 9)}</Text></View>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.textDim} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Caută în conversații..." placeholderTextColor={theme.colors.textDim} style={styles.searchInput} />
        </View>

        {loading ? (
          <Text style={styles.helper}>Se încarcă conversațiile...</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.helper}>Nicio conversație încă.</Text>
        ) : (
          filtered.map((card) => (
            <Pressable key={card.id} onPress={() => router.push(`/chat/${card.id}`)} style={styles.convCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{gradientTextSeed(card.email || card.name)}</Text>
              </View>
              <View style={styles.convBody}>
                <View style={styles.convTop}>
                  <Text numberOfLines={1} style={styles.convName}>{card.name}</Text>
                  <Text style={styles.convDate}>{new Date(card.date).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" })}</Text>
                </View>
                <Text numberOfLines={1} style={styles.convPreview}>{card.preview}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      <BottomTabBar />
    </AppShell>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  heroCard: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  eyebrow: {
    color: theme.colors.textDim,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  heroBody: {
    color: theme.colors.textSoft,
    fontSize: 16,
    lineHeight: 23,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  statLabel: {
    color: theme.colors.textDim,
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 54,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
  },
  helper: {
    color: theme.colors.textSoft,
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 15,
  },
  convCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    borderRadius: 26,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(154,113,193,0.55)",
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
  },
  convBody: {
    flex: 1,
  },
  convTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  convName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  convDate: {
    color: theme.colors.textDim,
    fontSize: 12,
  },
  convPreview: {
    color: theme.colors.textSoft,
    fontSize: 14,
    marginTop: 4,
  },
})
