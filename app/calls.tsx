import { useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { BottomTabBar } from "@/components/ui/BottomTabBar"
import { supabase } from "@/lib/supabase"
import { gradientTextSeed, theme } from "@/lib/theme"

type CallRow = {
  id: string
  conversation_id: string
  caller_id: string
  callee_id: string
  status: string
  call_type: "audio" | "video"
  created_at: string
  answered_at: string | null
  ended_at: string | null
}

type RawCallRow = {
  id: string
  conversation_id: string
  caller_id: string
  callee_id: string
  status: string
  call_type: string | null
  created_at: string
  answered_at: string | null
  ended_at: string | null
}

type ProfileLite = {
  id: string
  name: string | null
  alias: string | null
  email: string | null
}

type CallFilter = "all" | "audio" | "video" | "missed"

function isMissed(call: CallRow, currentUserId: string | null) {
  return call.status === "missed" || (call.status === "rejected" && call.callee_id === currentUserId)
}

function formatCallDate(date: string) {
  return new Date(date).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" })
}

function formatCallTime(date: string) {
  return new Date(date).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
}

export default function CallsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CallFilter>("all")
  const [search, setSearch] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [calls, setCalls] = useState<CallRow[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLite>>({})

  useEffect(() => {
    let active = true

    async function loadCalls() {
      try {
        if (active) setLoading(true)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!active) return

        if (!session?.user) {
          router.replace("/login")
          return
        }

        setCurrentUserId(session.user.id)

        const { data } = await supabase
          .from("call_sessions")
          .select("id, conversation_id, caller_id, callee_id, status, call_type, created_at, answered_at, ended_at")
          .or(`caller_id.eq.${session.user.id},callee_id.eq.${session.user.id}`)
          .order("created_at", { ascending: false })
          .limit(80)

        if (!active) return

        const loadedCalls: CallRow[] = ((data ?? []) as RawCallRow[]).map((item) => ({
          id: item.id,
          conversation_id: item.conversation_id,
          caller_id: item.caller_id,
          callee_id: item.callee_id,
          status: item.status,
          call_type: item.call_type === "video" ? "video" : "audio",
          created_at: item.created_at,
          answered_at: item.answered_at,
          ended_at: item.ended_at,
        }))
        setCalls(loadedCalls)

        const profileIds = Array.from(new Set(loadedCalls.flatMap((call) => [call.caller_id, call.callee_id]))).filter(Boolean)
        if (profileIds.length) {
          const { data: profilesData } = await supabase.from("profiles").select("id, name, alias, email").in("id", profileIds)
          if (!active) return
          const nextProfilesMap = ((profilesData ?? []) as ProfileLite[]).reduce<Record<string, ProfileLite>>((acc, item) => {
            acc[item.id] = item
            return acc
          }, {})
          setProfilesMap(nextProfilesMap)
        } else {
          setProfilesMap({})
        }
      } catch (error) {
        console.warn("loadCalls failed", error)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCalls()
    return () => {
      active = false
    }
  }, [router])

  const enrichedCalls = useMemo(() => {
    return calls.map((call) => {
      const otherUserId = currentUserId === call.caller_id ? call.callee_id : call.caller_id
      const otherProfile = profilesMap[otherUserId] || null
      const otherLabel = otherProfile?.name?.trim() || otherProfile?.alias?.trim() || otherProfile?.email?.split("@")[0] || "Membru"
      const incoming = currentUserId === call.callee_id
      const missed = isMissed(call, currentUserId)
      return { call, otherLabel, incoming, missed }
    })
  }, [calls, currentUserId, profilesMap])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return enrichedCalls.filter((item) => {
      if (filter === "audio" && item.call.call_type !== "audio") return false
      if (filter === "video" && item.call.call_type !== "video") return false
      if (filter === "missed" && !item.missed) return false
      if (!term) return true
      return item.otherLabel.toLowerCase().includes(term)
    })
  }, [enrichedCalls, filter, search])

  return (
    <AppShell padded={false}>
      <ScreenHeader eyebrow="VIVOS Messenger" title="Apeluri" />
      <View style={styles.content}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.textDim} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Caută apeluri..." placeholderTextColor={theme.colors.textDim} style={styles.searchInput} />
        </View>

        <View style={styles.filtersRow}>
          {[
            { key: "all", label: "Toate" },
            { key: "audio", label: "Audio" },
            { key: "video", label: "Video" },
            { key: "missed", label: "Ratate" },
          ].map((item) => {
            const active = filter === item.key
            return (
              <Pressable key={item.key} onPress={() => setFilter(item.key as CallFilter)} style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}>
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <Text style={styles.helper}>Se încarcă istoricul apelurilor...</Text>
          ) : filtered.length === 0 ? (
            <Text style={styles.helper}>Nu există apeluri pentru filtrul selectat.</Text>
          ) : (
            filtered.map(({ call, otherLabel, incoming, missed }) => (
              <Pressable key={call.id} onPress={() => router.push(`/chat/${call.conversation_id}`)} style={({ pressed }) => [styles.callCard, pressed && styles.pressed]}>
                <View style={[styles.avatarCircle, missed && styles.avatarMissed]}><Text style={styles.avatarText}>{gradientTextSeed(otherLabel)}</Text></View>
                <View style={styles.callBody}>
                  <View style={styles.callTop}>
                    <Text numberOfLines={1} style={styles.callName}>{otherLabel}</Text>
                    <Text style={styles.callDate}>{formatCallDate(call.created_at)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name={call.call_type === "video" ? "videocam-outline" : "call-outline"} size={15} color={missed ? "#FCA5A5" : theme.colors.textSoft} />
                    <Ionicons name={incoming ? "arrow-down-outline" : "arrow-up-outline"} size={15} color={missed ? "#FCA5A5" : theme.colors.textSoft} />
                    <Text style={[styles.metaText, missed && styles.metaMissed]}>
                      {missed ? "Ratat" : incoming ? "Primit" : "Inițiat"} · {call.call_type === "video" ? "Video" : "Audio"} · {formatCallTime(call.created_at)}
                    </Text>
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
    gap: 12,
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
  filtersRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  filterChipActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.18)",
  },
  filterLabel: {
    color: theme.colors.textSoft,
    fontSize: 14,
    fontWeight: "800",
  },
  filterLabelActive: {
    color: theme.colors.text,
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
  callCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    borderRadius: 24,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  pressed: {
    opacity: 0.78,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(99,166,230,0.52)",
  },
  avatarMissed: {
    backgroundColor: "rgba(248,113,113,0.36)",
  },
  avatarText: {
    color: "white",
    fontSize: 19,
    fontWeight: "900",
  },
  callBody: {
    flex: 1,
    gap: 7,
  },
  callTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  callName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "850",
  },
  callDate: {
    color: theme.colors.textDim,
    fontSize: 13,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    flex: 1,
    color: theme.colors.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  metaMissed: {
    color: "#FCA5A5",
  },
})
