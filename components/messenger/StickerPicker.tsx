import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { theme } from "@/lib/theme"
import { VIVOS_SMILE_STICKERS, VivosStickerId } from "@/lib/stickers/vivosSmilePack"

type Props = {
  visible: boolean
  sending?: boolean
  onClose: () => void
  onSelect: (id: VivosStickerId) => void
}

export function StickerPicker({ visible, sending = false, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>VIVOS Smile Pack 1</Text>
              <Text style={styles.subtitle}>Alege un sticker</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={VIVOS_SMILE_STICKERS}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <Pressable
                disabled={sending}
                onPress={() => onSelect(item.id)}
                style={({ pressed }) => [styles.stickerButton, pressed && styles.pressed, sending && styles.disabled]}
              >
                <Image source={item.source} style={styles.stickerImage} resizeMode="contain" />
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    maxHeight: "72%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 14,
    paddingBottom: 26,
    backgroundColor: "#173D70",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: theme.colors.textSoft,
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  grid: {
    paddingBottom: 8,
  },
  row: {
    justifyContent: "space-between",
  },
  stickerButton: {
    width: "32%",
    aspectRatio: 1,
    marginBottom: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  stickerImage: {
    width: "92%",
    height: "92%",
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.45,
  },
})
