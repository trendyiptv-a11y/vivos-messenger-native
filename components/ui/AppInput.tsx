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
        placeholderTextColor={theme.colors.textDim}
        style={[styles.input, style]}
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
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
    color: theme.colors.text,
    paddingHorizontal: 16,
    fontSize: 16,
  },
})
