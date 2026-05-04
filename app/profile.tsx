import { useEffect, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { AppShell } from "@/components/ui/AppShell"
import { ScreenHeader, HeaderIconButton } from "@/components/ui/ScreenHeader"
import { AppInput } from "@/components/ui/AppInput"
import { AppButton } from "@/components/ui/AppButton"
import { BottomTabBar } from "@/components/ui/BottomTabBar"
import { supabase } from "@/lib/supabase"
import { gradientTextSeed, theme } from "@/lib/theme"

type ProfileRow = {
  id: string
  name: string | null
  alias: string | null
  email: string | null
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
})
