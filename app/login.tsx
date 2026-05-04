import { useState } from "react"
import { Text, View, Image, StyleSheet } from "react-native"
import { Link, useRouter } from "expo-router"
import { AppShell } from "@/components/ui/AppShell"
import { AppInput } from "@/components/ui/AppInput"
import { AppButton } from "@/components/ui/AppButton"
import { supabase } from "@/lib/supabase"
import { theme } from "@/lib/theme"

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
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

  return (
    <AppShell>
      <View style={styles.centerWrap}>
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Image source={require("@/assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.eyebrow}>Messenger VIVOS</Text>
          <Text style={styles.title}>Intră în Messenger</Text>

          <View style={styles.form}>
            <AppInput label="Email" placeholder="nume@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <AppInput label="Parolă" placeholder="Parola ta" value={password} onChangeText={setPassword} secureTextEntry />

            <Text style={styles.forgot}>Ai uitat parola?</Text>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <AppButton title="Login" onPress={handleLogin} loading={loading} />
            <AppButton title="Creează cont" onPress={() => router.push("/signup")} variant="outline" />
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
    width: 92,
    height: 92,
    borderRadius: 24,
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
  forgot: {
    textAlign: "right",
    color: theme.colors.darkSoft,
    textDecorationLine: "underline",
  },
  message: {
    color: "#b91c1c",
    fontSize: 14,
  },
})
