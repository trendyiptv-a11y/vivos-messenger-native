import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { BottomTabBar } from "@/components/ui/BottomTabBar"
import { PresencePill } from "@/components/presence/PresencePill"
import { supabase } from "@/lib/supabase"
import { t } from "@/lib/i18n"
import { gradientTextSeed, theme } from "@/lib/theme"
import { getOrCreateDirectConversation } from "@/lib/messenger/conversations"
import { fetchPresenceMap, getPresenceInfo, UserPresenceRow } from "@/lib/presence/userPresence"

type ProfileRow = {
  id: string
  name: string | null
  alias: string | null
  email: string | null
}

function displayMember(profile: ProfileRow) {
  return profile.name?.trim() || profile.alias?.trim() || profile.email?.split("@")[0] || t("memberFallback")
}

export default function MembersScreen() {
  const router = useRouter()
  const mountedRef = useRef(true)
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [members, setMembers] = useState<ProfileRow[]>([])
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresenceRow>>({})

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadMembers = useCallback(async () => {
    try {
      if (mountedRef.current) {
        setLoading(true)
        setMessage("")
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mountedRef.current) return

      if (!session?.user) {
        router.replace("/login")
        return
      }

      setUserId(session.user.id)

      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, alias, email")
        .neq("id", session.user.id)
        .order("name", { ascending: true, nullsFirst: false })
        .limit(250)

      if (error) throw error

      const rows = (data ?? []) as ProfileRow[]
      const presence = await fetchPresenceMap(rows.map((row) => row.id))

      if (!mountedRef.current) return

      setMembers(rows)
      setPresenceMap(presence)
    } catch (error) {
      console.warn("Members load failed", error)
      if (mountedRef.current) {
        setMessage(error instanceof Error ? error.message : t("noMembers"))
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [router])

  useEffect(() => {
    let active = true
    loadMembers()

    const channel = supabase
      .channel(`native-members-live:${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        if (active && mountedRef.current) loadMembers()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => {
        if (active && mountedRef.current) loadMembers()
      })

    channel.subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel).catch(() => {})
    }
  }, [loadMembers])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return members

    return members.filter((member) =>
      [member.name || "", member.alias || "", member.email || ""]
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [members, search])

  async function openMember(member: ProfileRow) {
    if (!userId || openingId) return

    setOpeningId(member.id)
    setMessage("")

    try {
      const conversationId = await getOrCreateDirectConversation(userId, member.id)
      router.push(`/chat/${conversationId}`)
    } catch (error) {
      console.warn("Open member failed", error)
      setMessage(error instanceof Error ? error.message : t("conversationOpenError"))
    } finally {
      if (mountedRef.current) setOpeningId(null)
    }
  }

  return (
    <AppShell padded={false}>
      <ScreenHeader eyebrow="VIVOS Messenger" title={t("members")} />
      <View style={styles.content}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.textDim} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("searchMembers")}
            placeholderTextColor={theme.colors.textDim}
            style={styles.searchInput}
          />
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <Text style={styles.helper}>{t("loadingMembers")}</Text>
          ) : filtered.length === 0 ? (
            <Text style={styles.helper}>{t("noMembers")}</Text>
          ) : (
            filtered.map((member) => {
              const name = displayMember(member)
              const presence = getPresenceInfo(member.id, presenceMap[member.id])
              const opening = openingId === member.id

              return (
                <Pressable
                  key={member.id}
                  onPress={() => openMember(member)}
                  disabled={Boolean(openingId)}
                  style={({ pressed }) => [styles.memberCard, pressed && styles.cardPressed, opening && styles.cardOpening]}
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{gradientTextSeed(member.email || name)}</Text>
                  </View>

                  <View style={styles.memberBody}>
                    <View style={styles.memberTop}>
                      <Text numberOfLines={1} style={styles.memberName}>{name}</Text>
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.textSoft} />
                    </View>
                    <PresencePill presence={presence} compact />
                    <Text numberOfLines={1} style={styles.memberEmail}>{member.email || member.alias || t("memberFallback")}</Text>
                    {opening ? <Text style={styles.openingText}>{t("openingConversation")}</Text> : null}
                  </View>
                </Pressable>
              )
            })
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
  message: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "700",
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
  memberCard: {
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
  cardOpening: {
    opacity: 0.72,
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
  memberBody: {
    flex: 1,
    gap: 5,
  },
  memberTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  memberEmail: {
    color: theme.colors.textSoft,
    fontSize: 13,
  },
  openingText: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontWeight: "700",
  },
})
