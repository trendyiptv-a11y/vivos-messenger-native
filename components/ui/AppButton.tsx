import { ReactNode } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { theme } from "@/lib/theme"

type Props = {
  title: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: "primary" | "ghost" | "outline"
  leftIcon?: ReactNode
}

export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  leftIcon,
}: Props) {
  const content = (
    <>
      {loading ? <ActivityIndicator color={variant === "primary" ? "white" : theme.colors.darkText} /> : leftIcon}
      <Text style={[styles.text, variant === "ghost" && styles.textGhost, variant === "outline" && styles.textOutline]}>{title}</Text>
    </>
  )

  if (variant === "primary") {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.pressable, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>
        <LinearGradient colors={[theme.colors.accentStart, theme.colors.accentMid, theme.colors.accentEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primary}>
          {content}
        </LinearGradient>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.pressable,
        styles.secondary,
        variant === "outline" && styles.outline,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 18,
    overflow: "hidden",
  },
  primary: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
  },
  secondary: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    backgroundColor: theme.colors.card,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  text: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  textGhost: {
    color: theme.colors.text,
  },
  textOutline: {
    color: theme.colors.darkText,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.9,
  },
})
