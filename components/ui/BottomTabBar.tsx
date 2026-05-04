import { Pressable, StyleSheet, Text, View } from "react-native"
import { router, usePathname } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { t } from "@/lib/i18n"
import { theme } from "@/lib/theme"

const items = [
  { key: "inbox", labelKey: "messages" as const, href: "/inbox", icon: "chatbubble-outline" as const, iconActive: "chatbubble" as const },
  { key: "calls", labelKey: "calls" as const, href: "/calls", icon: "call-outline" as const, iconActive: "call" as const },
  { key: "profile", labelKey: "profile" as const, href: "/profile", icon: "person-outline" as const, iconActive: "person" as const },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const active = pathname === item.href
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              if (active) return
              router.replace(item.href as never)
            }}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          >
            <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
              <Ionicons name={active ? item.iconActive : item.icon} color={active ? "white" : theme.colors.textSoft} size={21} />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{t(item.labelKey)}</Text>
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
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(18,46,84,0.98)",
  },
  item: {
    alignItems: "center",
    gap: 5,
    minWidth: 72,
  },
  itemPressed: {
    opacity: 0.75,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  label: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  labelActive: {
    color: theme.colors.text,
  },
})
