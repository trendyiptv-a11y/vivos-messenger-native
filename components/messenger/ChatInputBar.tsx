import { Pressable, StyleSheet, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { theme } from "@/lib/theme"

type Props = {
  value: string
  onChangeText: (value: string) => void
  onSend: () => void
  sending: boolean
}

export function ChatInputBar({ value, onChangeText, onSend, sending }: Props) {
  const disabled = sending || !value.trim()

  return (
    <View style={styles.inputBar}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Scrie un mesaj..."
        placeholderTextColor={theme.colors.textDim}
        style={styles.input}
        multiline
      />
      <Pressable onPress={onSend} disabled={disabled} style={[styles.sendButton, disabled && styles.sendButtonDisabled]}>
        <Ionicons name="send-outline" size={20} color="white" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: "rgba(18,46,84,0.96)",
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
    color: theme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accentMid,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
})
