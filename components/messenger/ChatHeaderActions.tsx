import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { HeaderIconButton } from "@/components/ui/ScreenHeader"
import { theme } from "@/lib/theme"
import { CallType } from "@/types/call"

type Props = {
  menuOpen: boolean
  setMenuOpen: (value: boolean | ((prev: boolean) => boolean)) => void
  onStartCall: (callType: CallType) => void
  onLogout: () => void
}

export function ChatHeaderActions({ menuOpen, setMenuOpen, onStartCall, onLogout }: Props) {
  const router = useRouter()

  return (
    <View style={styles.headerRight}>
      <HeaderIconButton onPress={() => onStartCall("audio")}>
        <Ionicons name="call-outline" size={19} color={theme.colors.text} />
      </HeaderIconButton>
      <HeaderIconButton onPress={() => onStartCall("video")}>
        <Ionicons name="videocam-outline" size={19} color={theme.colors.text} />
      </HeaderIconButton>
      <View>
        <HeaderIconButton onPress={() => setMenuOpen((prev) => !prev)}>
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.text} />
        </HeaderIconButton>
        {menuOpen ? (
          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); router.push("/inbox") }}><Text style={styles.menuText}>Mesaje</Text></Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); router.push("/calls") }}><Text style={styles.menuText}>Apeluri</Text></Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); router.push("/profile") }}><Text style={styles.menuText}>Profil</Text></Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={onLogout}><Text style={styles.menuLogout}>Logout</Text></Pressable>
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menu: {
    position: "absolute",
    top: 46,
    right: 0,
    width: 180,
    borderRadius: 18,
    padding: 8,
    backgroundColor: "rgba(18,46,84,0.98)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 20,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  menuText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  menuLogout: {
    color: "#FCA5A5",
    fontSize: 15,
    fontWeight: "700",
  },
})
