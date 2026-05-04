import { useMemo, useState } from "react"
import { Linking, Pressable, Text, View, Image, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { AppShell } from "@/components/ui/AppShell"
import { AppInput } from "@/components/ui/AppInput"
import { AppButton } from "@/components/ui/AppButton"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { supabase } from "@/lib/supabase"
import { theme } from "@/lib/theme"

const VIVOS_MANIFEST_URL = "https://vivos-land.vercel.app/manifest"

export default function SignupScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [humanConfirmed, setHumanConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const passwordScore = useMemo(() => {
    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-ZĂÂÎȘȚ]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9ĂÂÎȘȚăâîșț]/.test(password)) score += 1
    return score
  }, [password])

  const passwordLabel = passwordScore >= 3 ? "Parolă bună" : passwordScore >= 2 ? "Parolă medie" : "Minimum 8 caractere"
  const passwordReady = password.length >= 8
  const canSignup = email.trim().length > 4 && passwordReady && acceptedTerms && humanConfirmed && !loading

  async function handleSignup() {
    if (!email.trim() || !password.trim()) return
    if (!passwordReady) {
      setMessage("Parola trebuie să aibă minimum 8 caractere.")
      return
    }
    if (!humanConfirmed) {
      setMessage("Confirmă că nu ești robot pentru a continua.")
      return
    }
    if (!acceptedTerms) {
      setMessage("Trebuie să accepți regulile comunității VIVOS pentru a crea contul.")
      return
    }

    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage("Cont creat. Verifică emailul pentru confirmare, apoi intră în Messenger.")
    setLoading(false)
  }

  async function openVivosManifest() {
    await Linking.openURL(VIVOS_MANIFEST_URL)
  }

  return (
    <AppShell>
      <View style={styles.centerWrap}>
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Image source={{ uri: "https://vivos-land.vercel.app/icons/icon-192.png" }} style={styles.logo} />
          </View>
          <Text style={styles.eyebrow}>Messenger VIVOS</Text>
          <Text style={styles.title}>Creează cont VIVOS</Text>

          <View style={styles.form}>
            <AppInput label="Email" placeholder="nume@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <PasswordInput label="Parolă" placeholder="Alege o parolă" value={password} onChangeText={setPassword} />

            <View style={styles.passwordHintRow}>
              <View style={styles.strengthTrack}>
                <View style={[styles.strengthFill, { width: `${Math.max(1, passwordScore) * 25}%` }, passwordScore >= 3 ? styles.goodStrength : passwordScore >= 2 ? styles.mediumStrength : styles.weakStrength]} />
              </View>
              <Text style={styles.passwordHint}>{passwordLabel}</Text>
            </View>

            <Pressable onPress={() => setHumanConfirmed((current) => !current)} style={({ pressed }) => [styles.checkCard, pressed && styles.pressed]}>
              <View style={[styles.checkBox, humanConfirmed && styles.checkBoxActive]}>
                {humanConfirmed ? <Ionicons name="checkmark" size={18} color="white" /> : null}
              </View>
              <View style={styles.checkTextWrap}>
                <Text style={styles.checkTitle}>Nu sunt robot</Text>
                <Text style={styles.checkSubtitle}>Confirmare locală pentru protecție anti-spam.</Text>
              </View>
            </Pressable>

            <Pressable onPress={() => setAcceptedTerms((current) => !current)} style={({ pressed }) => [styles.checkCard, pressed && styles.pressed]}>
              <View style={[styles.checkBox, acceptedTerms && styles.checkBoxActive]}>
                {acceptedTerms ? <Ionicons name="checkmark" size={18} color="white" /> : null}
              </View>
              <View style={styles.checkTextWrap}>
                <View style={styles.rulesTitleRow}>
                  <Text style={styles.checkTitle}>Accept regulile comunității </Text>
                  <Pressable onPress={openVivosManifest} hitSlop={8}>
                    <Text style={styles.vivosLink}>VIVOS</Text>
                  </Pressable>
                </View>
                <Text style={styles.checkSubtitle}>Apasă pe VIVOS pentru a citi manifestul comunității.</Text>
              </View>
            </Pressable>

            {message ? <Text style={[styles.message, message.includes("creat") ? styles.successMessage : null]}>{message}</Text> : null}

            <AppButton title="Creează cont" onPress={handleSignup} loading={loading} disabled={!canSignup} />
            <AppButton title="Am deja cont" onPress={() => router.push("/login")} variant="outline" />
          </View>
        </View>
      </View>
    </AppShell>
  )
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    borderRadius: 32,
    backgroundColor: theme.colors.whiteCard,
    padding: 24,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
  },
  eyebrow: {
    textAlign: "center",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 3,
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    marginTop: 10,
    textAlign: "center",
    color: theme.colors.darkText,
    fontSize: 22,
    fontWeight: "800",
  },
  form: {
    gap: 14,
    marginTop: 22,
  },
  passwordHintRow: {
    gap: 8,
  },
  strengthTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 999,
  },
  weakStrength: {
    backgroundColor: "#F97316",
  },
  mediumStrength: {
    backgroundColor: "#EAB308",
  },
  goodStrength: {
    backgroundColor: "#10B981",
  },
  passwordHint: {
    color: theme.colors.darkSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  checkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    backgroundColor: "white",
  },
  checkBoxActive: {
    borderColor: "#7C3AED",
    backgroundColor: "#7C3AED",
  },
  checkTextWrap: {
    flex: 1,
  },
  rulesTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  checkTitle: {
    color: theme.colors.darkText,
    fontSize: 14,
    fontWeight: "800",
  },
  vivosLink: {
    color: "#7C3AED",
    fontSize: 14,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  checkSubtitle: {
    color: theme.colors.darkSoft,
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.72,
  },
  message: {
    color: "#b91c1c",
    fontSize: 14,
  },
  successMessage: {
    color: "#047857",
    fontWeight: "700",
  },
})
