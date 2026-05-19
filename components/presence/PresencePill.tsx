import { StyleSheet, Text, View } from "react-native"
import { UserPresenceInfo } from "@/lib/presence/userPresence"
import { t } from "@/lib/i18n"
import { theme } from "@/lib/theme"

type Props = {
  presence?: UserPresenceInfo | null
  compact?: boolean
}

function colorForStatus(status?: string) {
  if (status === "connected") return "#34D399"
  return "#94A3B8"
}

function labelForStatus(status?: string) {
  return status === "connected" ? t("connected") : t("disconnected")
}

export function PresencePill({ presence, compact = false }: Props) {
  const status = presence?.status || "disconnected"
  const label = labelForStatus(status)
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
