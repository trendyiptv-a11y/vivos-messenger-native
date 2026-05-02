import { useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
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

function callStatusLabel(call: CallRow, currentUserId: string | null) {
  const incoming = currentUserId === call.callee_id
  if (call.status === "missed") return "Ratat"
  if (call.status === "rejected") return incoming ? "Respins" : "Anulat"
  if (call.status === "ended") return "Încheiat"
  if (call.status === "accepted") return "Acceptat"
  return call.status
}

function isMissed(call: CallRow, currentUserId: string | null) {
  return call.status === "missed" || (call.status === "rejected" && call.callee_id === currentUserId)
}

export default function CallsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CallFilter>("all")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [calls, setCalls] = useState<CallRow[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLite>>({})

  useEffect(() => {
    async function loadCalls() {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

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
        .limit(50)

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

      const profileIds = Array.from(new Set(loadedCalls.flatMap((call) => [call.caller_id, call.callee_id])))
      const { data: profilesData } = await supabase.from("profiles").select("id, name, alias, email").in("id", profileIds)
      const nextProfilesMap = ((profilesData ?? []) as ProfileLite[]).reduce<Record<string, ProfileLite>>((acc, item) => {
        acc[item.id] = item
        return acc
      }, {})
      setProfilesMap(nextProfilesMap)
      setLoading(false)
    }

    loadCalls()
  }, [router])

  const filtered = useMemo(() => {
    return calls.filter((call) => {
      if (filter === "audio") return call.call_type === "audio"
      if (filter === "video") return call.call_type === "video"
      if (filter === "missed") return isMissed(call, currentUserId)
      return true
    })
  }, [calls, currentUserId, filter])

  const stats = useMemo(() => {
    const todayKey = new Date().toDateString()
    return {
      today: calls.filter((call) => new Date(call.created_at).toDateString() === todayKey).length,
      answered: calls.filter((call) => call.status === "accepted" || call.status === "ended").length,
      missed: calls.filter((call) => isMissed(call, currentUserId)).length,
    }
  }, [calls, currentUserId])

  return (
    <AppShell padded={false}>
      <ScreenHeader eyebrow="VIVOS Messenger" title="Apeluri" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsPanel}>
          <View style={styles.statCard}><Text style={styles.statLabel}>Astăzi</Text><Text style={styles.statValue}>{stats.today}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Răspunse</Text><Text style={styles.statValue}>{stats.answered}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Ratate</Text><Text style={styles.statValue}>{stats.missed}</Text></View>
        </View>

        <View style={styles.filtersRow}>
          {[
            { key: "all", label: "Toate" },
            { key: "audio", label: "Audio" },
            { key: "video", label: "Video" },
            { key: "missed", label: "Ratat" },
          ].map((item) => {
            const active = filter === item.key
            return (
              <Pressable key={item.key} onPress={() => setFilter(item.key as CallFilter)} style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {loading ? (
          <Text style={styles.helper}>Se încarcă istoricul apelurilor...</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.helper}>Nu există apeluri pentru filtrul selectat.</Text>
        ) : (
          filtered.map((call) => {
            const otherUserId = currentUserId === call.caller_id ? call.callee_id : call.caller_id
            const otherProfile = profilesMap[otherUserId] || null
            const otherLabel = otherProfile?.alias?.trim() || otherProfile?.name?.trim() || otherProfile?.email?.split("@")[0] || "Membru"
            const incoming = currentUserId === call.callee_id
            const missed = isMissed(call, currentUserId)

            return (
              <Pressable key={call.id} onPress={() => router.push(`/chat/${call.conversation_id}`)} style={styles.callCard}>
                <View style={styles.avatarCircle}><Text style={styles.avatarText}>{gradientTextSeed(otherLabel)}</Text></View>
                <View style={styles.callBody}>
                  <View style={styles.callTop}>
                    <Text numberOfLines={1} style={styles.callName}>{otherLabel}</Text>
                    <Text style={[styles.badge, missed ? styles.badgeMissed : styles.badgeOk]}>{callStatusLabel(call, currentUserId)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name={call.call_type === "video" ? "videocam-outline" : "call-outline"} size={14} color={theme.colors.textSoft} />
                    <Text style={styles.metaText}>{call.call_type === "video" ? "Video" : "Audio"}</Text>
                    <Ionicons name={incoming ? "arrow-down-outline" : "arrow-up-outline"} size={14} color={theme.colors.textSoft} />
                    <Text style={styles.metaText}>{incoming ? "Primit" : "Inițiat"}</Text>
                    <Text style={styles.metaText}>{new Date(call.created_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" })}</Text>
                  </View>
                </View>
              </Pressable>
            )
          })
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
  statsPanel: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.cardStrong,
  },
  filterLabel: {
    color: theme.colors.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  filterLabelActive: {
    color: theme.colors.text,
  },
  helper: {
    color: theme.colors.textSoft,
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 15,
  },
  callCard: {
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
    backgroundColor: "rgba(99,166,230,0.45)",
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
  },
  callBody: {
    flex: 1,
    gap: 8,
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
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
  },
  badgeOk: {
    backgroundColor: "rgba(52,211,153,0.18)",
    color: "#A7F3D0",
  },
  badgeMissed: {
    backgroundColor: "rgba(248,113,113,0.18)",
    color: "#FECACA",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  metaText: {
    color: theme.colors.textSoft,
    fontSize: 13,
  },
})
