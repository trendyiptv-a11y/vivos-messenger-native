import { ReactNode } from "react"
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context"
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native"
import { theme } from "@/lib/theme"

type Props = {
  children: ReactNode
  padded?: boolean
}

export function AppShell({ children, padded = true }: Props) {
  return (
    <LinearGradient
      colors={[theme.colors.bgTop, theme.colors.bgBottom]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.content, padded && styles.padded]}>{children}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1 },
  padded: { paddingHorizontal: 20, paddingBottom: 20 },
})
