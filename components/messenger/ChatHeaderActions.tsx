import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { HeaderIconButton } from "@/components/ui/ScreenHeader"
import { theme } from "@/lib/theme"
import { CallType } from "@/types/call"

type Props = {
  menuOpen: boolean
  setMenuOpen: (value: boolean | ((prev: boolean) => boolean)) => void

  // Păstrat temporar pentru compatibilitate cu app/chat/[id].tsx.
  // Nu mai este folosit în header, pentru că apelurile vechi sunt dezactivate.
  onStartCall: (callType: CallType) => void

  onLogout: () => void
  onOpenMessages: () => void
}

function MenuRow({
  icon,
  label,
  danger = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  danger?: boolean
  onPress: () => void
}) {
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={danger ? "#FCA5A5" : theme.colors.text} />
      <Text style={[styles.menuText, danger && styles.menuLogout]}>{label}</Text>
    </Pressable>
  )
}

export function ChatHeaderActions({ menuOpen, setMenuOpen, onLogout, onOpenMessages }: Props) {
  function closeMenu() {
    setMenuOpen(false)
  }

  function navigateTo(href: "/calls" | "/profile") {
    closeMenu()
    setTimeout(() => {
      router.replace(href as never)
    }, 80)
  }

  function handleMessagesPress() {
    closeMenu()
    setTimeout(onOpenMessages, 80)
  }

  function handleLogoutPress() {
    closeMenu()
    setTimeout(onLogout, 80)
  }

  return (
    <View style={styles.headerRight}>
      <HeaderIconButton onPress={() => setMenuOpen((prev) => !prev)}>
        <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.text} />
      </HeaderIconButton>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <Pressable style={styles.menuCard}>
            <Text style={styles.menuTitle}>Conversație</Text>

            <MenuRow icon="chatbubble-outline" label="Mesaje" onPress={handleMessagesPress} />

            <MenuRow icon="videocam-outline" label="Apeluri V2 active în conversație" onPress={closeMenu} />

            <MenuRow icon="call-outline" label="Istoric apeluri" onPress={() => navigateTo("/calls")} />

            <MenuRow icon="person-outline" label="Profil" onPress={() => navigateTo("/profile")} />

            <View style={styles.menuDivider} />

            <MenuRow icon="log-out-outline" label="Logout" danger onPress={handleLogoutPress} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.28)",
  },
  menuCard: {
    position: "absolute",
    top: 96,
    right: 18,
    width: 250,
    borderRadius: 24,
    padding: 10,
    backgroundColor: "rgba(15,38,72,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
  },
  menuTitle: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
  },
  menuItemPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  menuText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 6,
    marginHorizontal: 8,
  },
  menuLogout: {
    color: "#FCA5A5",
  },
})
