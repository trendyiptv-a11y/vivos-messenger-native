import { useState } from "react"
import { Text, View, Image, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { AppShell } from "@/components/ui/AppShell"
import { AppInput } from "@/components/ui/AppInput"
import { AppButton } from "@/components/ui/AppButton"
import { supabase } from "@/lib/supabase"
import { theme } from "@/lib/theme"

export default function SignupScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSignup() {
    if (!email.trim() || !password.trim()) return
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
            <AppInput label="Parolă" placeholder="Alege o parolă" value={password} onChangeText={setPassword} secureTextEntry />

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <AppButton title="Sign up" onPress={handleSignup} loading={loading} />
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
  message: {
    color: theme.colors.darkSoft,
    fontSize: 14,
  },
})
