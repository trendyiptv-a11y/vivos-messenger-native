import { useState } from "react"
import { Text, View, Image, StyleSheet, Pressable, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { AppShell } from "@/components/ui/AppShell"
import { AppInput } from "@/components/ui/AppInput"
import { AppButton } from "@/components/ui/AppButton"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { supabase } from "@/lib/supabase"
import { theme } from "@/lib/theme"

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    router.replace("/inbox")
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim()
    setMessage("")

    if (!cleanEmail) {
      setMessage("Scrie adresa de email, apoi apasă din nou pe «Ai uitat parola?». ")
      return
    }

    try {
      setResetLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail)

      if (error) {
        setMessage(error.message)
        return
      }

      setMessage("Ți-am trimis un email pentru resetarea parolei. Verifică Inbox / Spam.")
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <AppShell padded={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Image source={require("@/assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.eyebrow}>Messenger VIVOS</Text>
          <Text style={styles.title}>Intră în Messenger</Text>

          <View style={styles.form}>
            <AppInput label="Email" placeholder="nume@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <PasswordInput label="Parolă" placeholder="Parola ta" value={password} onChangeText={setPassword} />

            <Pressable disabled={resetLoading} onPress={handleForgotPassword} hitSlop={10} style={({ pressed }) => [styles.forgotButton, pressed && styles.forgotPressed]}>
              <Text style={styles.forgot}>{resetLoading ? "Se trimite..." : "Ai uitat parola?"}</Text>
            </Pressable>

            {message ? <Text style={[styles.message, message.includes("trimis") ? styles.successMessage : null]}>{message}</Text> : null}

            <AppButton title="Login" onPress={handleLogin} loading={loading} />
            <AppButton title="Creează cont" onPress={() => router.push("/signup")} variant="outline" />
          </View>
        </View>
      </ScrollView>
    </AppShell>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  card: {
    borderRadius: 32,
    backgroundColor: theme.colors.whiteCard,
    padding: 24,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 22,
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
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  forgotPressed: {
    opacity: 0.65,
  },
  forgot: {
    textAlign: "right",
    color: theme.colors.darkSoft,
    textDecorationLine: "underline",
    fontWeight: "700",
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
