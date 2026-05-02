import { StyleSheet, Text, View } from "react-native"
import { theme } from "@/lib/theme"
import { NativeVideoSurface } from "@/components/messenger/NativeVideoSurface"

type Props = {
  label: string
  ready: boolean
  compact?: boolean
  streamURL?: string | null
}

export function VideoPreviewPlaceholder({ label, ready, compact = false, streamURL = null }: Props) {
  if (streamURL) {
    return <NativeVideoSurface label={label} streamURL={streamURL} compact={compact} />
  }

  return (
    <View style={[styles.box, compact && styles.boxCompact, ready ? styles.ready : styles.waiting]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.state}>{ready ? "Preview gata" : "Preview în așteptare"}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    minHeight: 120,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 12,
    padding: 12,
  },
  boxCompact: {
    minHeight: 88,
  },
  waiting: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  ready: {
    backgroundColor: "rgba(52,211,153,0.10)",
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
  },
})
