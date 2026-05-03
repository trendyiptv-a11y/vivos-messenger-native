import { forwardRef } from "react"
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native"
import { theme } from "@/lib/theme"

type Props = TextInputProps & {
  label?: string
}

export const AppInput = forwardRef<TextInput, Props>(function AppInput({ label, style, ...props }, ref) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#64748B"
        style={[styles.input, style]}
        autoCorrect={false}
        {...props}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: theme.colors.darkText,
    fontSize: 15,
    fontWeight: "700",
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: theme.colors.darkText,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
  },
})
