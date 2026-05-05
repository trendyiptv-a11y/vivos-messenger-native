import { StyleSheet, Text, View } from "react-native"
import { theme } from "@/lib/theme"

type Props = {
  streamURL: string | null
  label: string
  compact?: boolean
  fill?: boolean
}

export function NativeVideoSurface({ streamURL, label, compact = false, fill = false }: Props) {
  let RTCView: any = null

  try {
    RTCView = require("react-native-webrtc").RTCView
  } catch {
    RTCView = null
  }

  const isLocalPreview = compact || label.toLowerCase().includes("local") || label.toLowerCase().includes("tu")

  if (!RTCView || !streamURL) {
    return (
      <View style={[styles.fallback, fill && styles.fillSurface, compact && styles.compactSurface]}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.state}>{streamURL ? "RTCView indisponibil în build" : "Stream indisponibil"}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.wrap, fill && styles.fillSurface, compact && styles.compactSurface]}>
      <RTCView
        streamURL={streamURL}
        style={StyleSheet.absoluteFillObject}
        objectFit="cover"
        mirror={isLocalPreview}
        zOrder={compact ? 2 : 0}
      />
      <View style={[styles.badge, compact && styles.compactBadge]}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    height: 260,
    overflow: "hidden",
    borderRadius: 22,
    marginTop: 12,
    backgroundColor: "black",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fillSurface: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    marginTop: 0,
    borderWidth: 0,
  },
  compactSurface: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    marginTop: 0,
    borderWidth: 0,
  },
  fallback: {
    width: "100%",
    height: 260,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  label: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  state: {
    color: theme.colors.textSoft,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  compactBadge: {
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
})
