import { useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { theme } from "@/lib/theme"

type Props = TextInputProps & {
  label?: string
}

export function PasswordInput({ label = "Parolă", style, ...props }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputShell}>
        <TextInput
          placeholderTextColor="#64748B"
          style={[styles.input, style]}
          autoCorrect={false}
          autoCapitalize="none"
          secureTextEntry={!visible}
          {...props}
        />
        <Pressable
          onPress={() => setVisible((current) => !current)}
          hitSlop={10}
          style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Ascunde parola" : "Arată parola"}
        >
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color="#475569" />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: theme.colors.darkText,
    fontSize: 15,
    fontWeight: "700",
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  input: {
    flex: 1,
    color: theme.colors.darkText,
    paddingHorizontal: 16,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: "600",
  },
  eyeButton: {
    width: 52,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.65,
  },
})
