import { useEffect, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as Notifications from "expo-notifications"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader, HeaderIconButton } from "@/components/ui/ScreenHeader"
import { AppInput } from "@/components/ui/AppInput"
import { AppButton } from "@/components/ui/AppButton"
import { BottomTabBar } from "@/components/ui/BottomTabBar"
import { supabase } from "@/lib/supabase"
import { registerPushTokenDetailed, showLocalIncomingCallNotification, showLocalMessageNotification } from "@/lib/notifications"
import { sendVivosPush } from "@/lib/push"
import { gradientTextSeed, theme } from "@/lib/theme"

type ProfileRow = {
  id: string
  name: string | null
  alias: string | null
  email: string | null
}

type DevicePushTokenRow = {
  token: string
  platform: string | null
  updated_at: string | null
}

type RefreshOptions = {
  silentWhenMissing?: boolean
}

export default function ProfileScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [alias, setAlias] = useState("")
  const [pushBusy, setPushBusy] = useState(false)
  const [pushStatus, setPushStatus] = useState("Neverificat")
  const [pushPermission, setPushPermission] = useState("necunoscut")
  const [pushTokenPreview, setPushTokenPreview] = useState("—")
  const [lastTokenUpdate, setLastTokenUpdate] = useState("—")

  async function refreshPushDiagnostics(currentUserId?: string | null, options: RefreshOptions = {}) {
    const targetUserId = currentUserId ?? userId
    try {
      const permissions = await Notifications.getPermissionsAsync()
      setPushPermission(permissions.granted ? "acordată" : "neacordată")

      if (!targetUserId) return
      const { data, error } = await supabase
        .from("device_push_tokens")
        .select("token, platform, updated_at")
        .eq("user_id", targetUserId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        setPushStatus(`Eroare citire token: ${error.message}`)
        return
      }

      const tokenRow = (data ?? null) as DevicePushTokenRow | null
      if (!tokenRow?.token) {
        setPushTokenPreview("—")
        setLastTokenUpdate("—")
        if (!options.silentWhenMissing) {
          setPushStatus("Tokenul nu este salvat încă")
        }
        return
      }

      setPushTokenPreview(`${tokenRow.token.slice(0, 18)}...${tokenRow.token.slice(-8)}`)
      setLastTokenUpdate(tokenRow.updated_at ? new Date(tokenRow.updated_at).toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—")
      setPushStatus("Token salvat în Supabase")
    } catch (error) {
      setPushStatus(`Diagnostic push eșuat: ${error instanceof Error ? error.message : String(error)}`)
      console.warn("refreshPushDiagnostics failed", error)
    }
  }

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/login")
        return
      }

      setUserId(session.user.id)
      setEmail(session.user.email ?? "")

      const { data } = await supabase
        .from("profiles")
        .select("id, name, alias, email")
        .eq("id", session.user.id)
        .maybeSingle()

      const profile = (data ?? null) as ProfileRow | null
      setName(profile?.name ?? "")
      setAlias(profile?.alias ?? "")
      setEmail(profile?.email ?? session.user.email ?? "")
      await refreshPushDiagnostics(session.user.id)
      setLoading(false)
    }

    loadProfile()
  }, [router])

  async function saveProfile() {
    if (!userId) return
    setSaving(true)
    setMessage("")

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: email || null,
        name: name.trim() || null,
        alias: alias.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage("Profilul Messenger a fost actualizat.")
    setSaving(false)
  }

  async function handleRegisterPushToken() {
    if (!userId) return
    setPushBusy(true)
    setPushStatus("Cer permisiune, obțin token și îl salvez...")
    try {
      const result = await registerPushTokenDetailed(userId)
      if (result.ok && result.token) {
        setPushTokenPreview(`${result.token.slice(0, 18)}...${result.token.slice(-8)}`)
        setPushStatus(`Token salvat. Project: ${result.projectId?.slice(0, 8) ?? "—"}`)
        await refreshPushDiagnostics(userId)
      } else {
        setPushStatus(`Eroare ${result.stage}: ${result.error || "necunoscut"}`)
        await refreshPushDiagnostics(userId, { silentWhenMissing: true })
      }
    } finally {
      setPushBusy(false)
    }
  }

  async function handleLocalMessageTest() {
    setPushBusy(true)
    setPushStatus("Trimit notificare locală de mesaj...")
    try {
      await showLocalMessageNotification("Test VIVOS", "Aceasta este o notificare locală de mesaj.")
      setPushStatus("Notificare locală mesaj trimisă")
    } finally {
      setPushBusy(false)
    }
  }

  async function handleLocalCallTest() {
    setPushBusy(true)
    setPushStatus("Trimit notificare locală de apel...")
    try {
      await showLocalIncomingCallNotification(name || alias || "VIVOS", "audio")
      setPushStatus("Notificare locală apel trimisă")
    } finally {
      setPushBusy(false)
    }
  }

  async function handleRemotePushTest() {
    if (!userId) return
    setPushBusy(true)
    setPushStatus("Testez endpoint-ul /api/push...")
    try {
      const result = await sendVivosPush({
        targetUserId: userId,
        type: "system",
        title: "Test VIVOS",
        body: "Endpoint-ul /api/push răspunde și trimite către acest telefon.",
        data: { kind: "diagnostic" },
      })
      setPushStatus(result.ok ? "Endpoint /api/push OK" : `Endpoint /api/push eroare: ${JSON.stringify(result).slice(0, 120)}`)
      await refreshPushDiagnostics(userId, { silentWhenMissing: !result.ok })
    } finally {
      setPushBusy(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <AppShell padded={false}>
      <ScreenHeader
        eyebrow="VIVOS Messenger"
        title="Profil"
        right={
          <HeaderIconButton onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.text} />
          </HeaderIconButton>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identityCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{gradientTextSeed(email || name || alias)}</Text>
          </View>
          <View style={styles.identityBody}>
            <Text style={styles.identityName}>{name.trim() || "Membru Messenger"}</Text>
            <Text style={styles.identityAlias}>{alias.trim() ? `@${alias.trim()}` : "Fără alias"}</Text>
            <Text style={styles.identityEmail}>{email}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Actualizează profilul Messenger</Text>
          <View style={styles.formFields}>
            <AppInput label="Email" value={email} editable={false} style={styles.readonly} />
            <AppInput label="Nume afișat în conversații" value={name} onChangeText={setName} placeholder="Numele tău în Messenger" />
            <AppInput label="Alias scurt" value={alias} onChangeText={setAlias} placeholder="Alias scurt" />
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <AppButton title={saving ? "Se salvează..." : "Salvează"} onPress={saveProfile} loading={saving} leftIcon={<Ionicons name="save-outline" size={18} color="white" />} />
          </View>
        </View>

        <View style={styles.diagnosticCard}>
          <Text style={styles.diagnosticTitle}>Diagnostic notificări native</Text>
          <View style={styles.diagnosticRows}>
            <View style={styles.diagnosticRow}><Text style={styles.diagnosticLabel}>Permisiune</Text><Text style={styles.diagnosticValue}>{pushPermission}</Text></View>
            <View style={styles.diagnosticRow}><Text style={styles.diagnosticLabel}>Token</Text><Text numberOfLines={1} style={styles.diagnosticValue}>{pushTokenPreview}</Text></View>
            <View style={styles.diagnosticRow}><Text style={styles.diagnosticLabel}>Actualizat</Text><Text style={styles.diagnosticValue}>{lastTokenUpdate}</Text></View>
            <View style={styles.diagnosticRow}><Text style={styles.diagnosticLabel}>Status</Text><Text style={styles.diagnosticValue}>{pushStatus}</Text></View>
          </View>

          <View style={styles.diagnosticButtons}>
            <Pressable disabled={pushBusy} style={({ pressed }) => [styles.diagnosticButton, pressed && styles.pressed]} onPress={handleRegisterPushToken}>
              <Ionicons name="notifications-outline" size={18} color={theme.colors.text} />
              <Text style={styles.diagnosticButtonText}>Activează token</Text>
            </Pressable>
            <Pressable disabled={pushBusy} style={({ pressed }) => [styles.diagnosticButton, pressed && styles.pressed]} onPress={handleLocalMessageTest}>
              <Ionicons name="chatbubble-outline" size={18} color={theme.colors.text} />
              <Text style={styles.diagnosticButtonText}>Test mesaj</Text>
            </Pressable>
            <Pressable disabled={pushBusy} style={({ pressed }) => [styles.diagnosticButton, pressed && styles.pressed]} onPress={handleLocalCallTest}>
              <Ionicons name="call-outline" size={18} color={theme.colors.text} />
              <Text style={styles.diagnosticButtonText}>Test apel</Text>
            </Pressable>
            <Pressable disabled={pushBusy} style={({ pressed }) => [styles.diagnosticButton, pressed && styles.pressed]} onPress={handleRemotePushTest}>
              <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
              <Text style={styles.diagnosticButtonText}>Test server</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <BottomTabBar />
    </AppShell>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 28,
    padding: 18,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(154,113,193,0.55)",
  },
  avatarText: {
    color: "white",
    fontSize: 26,
    fontWeight: "800",
  },
  identityBody: {
    flex: 1,
  },
  identityName: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  identityAlias: {
    color: theme.colors.textSoft,
    fontSize: 15,
    marginTop: 4,
  },
  identityEmail: {
    color: theme.colors.textDim,
    fontSize: 13,
    marginTop: 4,
  },
  formCard: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: theme.colors.whiteCard,
  },
  formTitle: {
    color: theme.colors.darkText,
    fontSize: 24,
    fontWeight: "800",
  },
  formFields: {
    marginTop: 18,
    gap: 14,
  },
  readonly: {
    backgroundColor: "#E5E7EB",
    color: theme.colors.darkText,
  },
  message: {
    color: theme.colors.darkSoft,
    fontSize: 14,
  },
  diagnosticCard: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
  },
  diagnosticTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  diagnosticRows: {
    gap: 8,
  },
  diagnosticRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  diagnosticLabel: {
    color: theme.colors.textDim,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  diagnosticValue: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  diagnosticButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  diagnosticButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  diagnosticButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.75,
  },
})
