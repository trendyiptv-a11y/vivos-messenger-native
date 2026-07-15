import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { theme } from "@/lib/theme"

type Props = {
  value: string
  onChangeText: (value: string) => void
  onSend: () => void
  onOpenStickers: () => void
  onCapturePhoto: () => void
  onCaptureVideo: () => void
  onPickPhoto: () => void
  onPickVideo: () => void
  onPickFile: () => void
  sending: boolean
  attaching?: boolean
}

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  onOpenStickers,
  onCapturePhoto,
  onCaptureVideo,
  onPickPhoto,
  onPickVideo,
  onPickFile,
  sending,
  attaching = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const disabled = sending || attaching || !value.trim()

  function choose(action: () => void) {
    setMenuOpen(false)
    action()
  }

  return (
    <>
      <View style={styles.inputBar}>
        <Pressable disabled={attaching} onPress={() => setMenuOpen(true)} style={[styles.attachButton, attaching && styles.sendButtonDisabled]}>
          <Ionicons name={attaching ? "cloud-upload-outline" : "add"} size={24} color="white" />
        </Pressable>

        <Pressable disabled={sending || attaching} onPress={onOpenStickers} style={[styles.stickerButton, (sending || attaching) && styles.sendButtonDisabled]}>
          <Ionicons name="happy-outline" size={23} color="white" />
        </Pressable>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={attaching ? "Se încarcă atașamentul..." : "Scrie un mesaj..."}
          placeholderTextColor={theme.colors.textDim}
          style={styles.input}
          multiline
        />
        <Pressable onPress={onSend} disabled={disabled} style={[styles.sendButton, disabled && styles.sendButtonDisabled]}>
          <Ionicons name="send-outline" size={20} color="white" />
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Adaugă în conversație</Text>
            <Pressable style={styles.sheetOption} onPress={() => choose(onCapturePhoto)}>
              <Ionicons name="camera-outline" size={22} color={theme.colors.text} />
              <Text style={styles.sheetOptionText}>Fă poză</Text>
            </Pressable>
            <Pressable style={styles.sheetOption} onPress={() => choose(onCaptureVideo)}>
              <Ionicons name="videocam-outline" size={22} color={theme.colors.text} />
              <Text style={styles.sheetOptionText}>Filmează</Text>
            </Pressable>
            <View style={styles.sheetDivider} />
            <Pressable style={styles.sheetOption} onPress={() => choose(onPickPhoto)}>
              <Ionicons name="image-outline" size={22} color={theme.colors.text} />
              <Text style={styles.sheetOptionText}>Alege foto</Text>
            </Pressable>
            <Pressable style={styles.sheetOption} onPress={() => choose(onPickVideo)}>
              <Ionicons name="albums-outline" size={22} color={theme.colors.text} />
              <Text style={styles.sheetOptionText}>Alege video</Text>
            </Pressable>
            <Pressable style={styles.sheetOption} onPress={() => choose(onPickFile)}>
              <Ionicons name="document-attach-outline" size={22} color={theme.colors.text} />
              <Text style={styles.sheetOptionText}>Fișier</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: "rgba(18,46,84,0.96)",
  },
  attachButton: {
    width: 46,
    height: 52,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stickerButton: {
    width: 46,
    height: 52,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    margin: 14,
    borderRadius: 26,
    padding: 16,
    gap: 8,
    backgroundColor: "#173D70",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sheetTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  sheetOption: {
    minHeight: 50,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  sheetOptionText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  sheetDivider: {
    height: 1,
    marginVertical: 3,
    backgroundColor: theme.colors.border,
  },
})
