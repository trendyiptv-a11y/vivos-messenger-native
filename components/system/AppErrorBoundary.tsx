import React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { theme } from "@/lib/theme"

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
  errorMessage: string
  errorStack: string
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: "",
    errorStack: "",
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const err = error instanceof Error ? error : new Error(String(error))
    return {
      hasError: true,
      errorMessage: err.message || "Eroare necunoscută",
      errorStack: err.stack || "Fără stack trace disponibil.",
    }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.warn("VIVOS AppErrorBoundary", error, info.componentStack)
  }

  reset = () => {
    this.setState({ hasError: false, errorMessage: "", errorStack: "" })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning-outline" size={32} color="#FCA5A5" />
          </View>
          <Text style={styles.eyebrow}>VIVOS Messenger</Text>
          <Text style={styles.title}>Aplicația a prins o eroare</Text>
          <Text style={styles.body}>
            Nu s-a închis complet. Copiază sau fotografiază textul de mai jos ca să putem corecta exact cauza.
          </Text>

          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Mesaj</Text>
            <Text selectable style={styles.errorText}>{this.state.errorMessage}</Text>
          </View>

          <ScrollView style={styles.stackBox} contentContainerStyle={styles.stackContent}>
            <Text selectable style={styles.stackText}>{this.state.errorStack}</Text>
          </ScrollView>

          <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={this.reset}>
            <Ionicons name="refresh-outline" size={18} color="white" />
            <Text style={styles.buttonText}>Încearcă din nou</Text>
          </Pressable>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bgBottom,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    borderRadius: 30,
    padding: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,113,113,0.14)",
  },
  eyebrow: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: "900",
  },
  body: {
    color: theme.colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  errorBox: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  errorTitle: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  errorText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  stackBox: {
    maxHeight: 180,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  stackContent: {
    padding: 12,
  },
  stackText: {
    color: theme.colors.textSoft,
    fontSize: 11,
    lineHeight: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: theme.colors.accentMid,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },
})
