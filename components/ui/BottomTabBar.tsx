import { Pressable, StyleSheet, Text, View } from "react-native"
import { router, usePathname } from "expo-router"
import { MessageCircle, Phone, UserRound } from "lucide-react-native"
import { theme } from "@/lib/theme"

const items = [
  { key: "inbox", label: "Mesaje", href: "/inbox", icon: MessageCircle },
  { key: "calls", label: "Apeluri", href: "/calls", icon: Phone },
  { key: "profile", label: "Profil", href: "/profile", icon: UserRound },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href
        return (
          <Pressable key={item.key} onPress={() => router.push(item.href as never)} style={styles.item}>
            <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
              <Icon color={active ? "white" : theme.colors.textSoft} size={20} />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: "rgba(18,46,84,0.98)",
  },
  item: {
    alignItems: "center",
    gap: 6,
    minWidth: 72,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleActive: {
    backgroundColor: theme.colors.cardStrong,
  },
  label: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  labelActive: {
    color: theme.colors.text,
  },
})
