import { StyleSheet, Text, View } from "react-native"
import { UserPresenceInfo } from "@/lib/presence/userPresence"
import { theme } from "@/lib/theme"

type Props = {
  presence?: UserPresenceInfo | null
  compact?: boolean
}

function colorForStatus(status?: string) {
  if (status === "online") return "#34D399"
  if (status === "recent") return "#FBBF24"
  if (status === "offline") return "#94A3B8"
  return "#64748B"
}

export function PresencePill({ presence, compact = false }: Props) {
  const status = presence?.status || "unknown"
  const label = presence?.label || "Status necunoscut"
  const color = colorForStatus(status)

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={[styles.label, compact && styles.labelCompact]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  wrapCompact: {
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: theme.colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  labelCompact: {
    fontSize: 12,
  },
})
