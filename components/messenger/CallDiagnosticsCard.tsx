import { StyleSheet, Text, View } from "react-native"
import { WebRtcManagerState } from "@/lib/calls/webrtc"
import { theme } from "@/lib/theme"

type Props = {
  webrtcStatus: string
  mediaReady: boolean
  state: WebRtcManagerState | null
}

export function CallDiagnosticsCard({ webrtcStatus, mediaReady, state }: Props) {
  const localReady = state?.localStreamReady ? "da" : "nu"
  const remoteReady = state?.remoteStreamReady ? "da" : "nu"
  const turnCount = state?.iceServers.length ?? 0

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Stare apel</Text>
      <Text style={styles.status}>{mediaReady ? "Microfon/cameră pregătite" : "Se pregătește media..."}</Text>
      <View style={styles.grid}>
        <View style={styles.pill}><Text style={styles.pillLabel}>WebRTC</Text><Text style={styles.pillValue}>{webrtcStatus}</Text></View>
        <View style={styles.pill}><Text style={styles.pillLabel}>Local</Text><Text style={styles.pillValue}>{localReady}</Text></View>
        <View style={styles.pill}><Text style={styles.pillLabel}>Remote</Text><Text style={styles.pillValue}>{remoteReady}</Text></View>
        <View style={styles.pill}><Text style={styles.pillLabel}>TURN</Text><Text style={styles.pillValue}>{turnCount}</Text></View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    alignSelf: "stretch",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  title: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  status: {
    color: theme.colors.textSoft,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  pill: {
    width: "48%",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 10,
  },
  pillLabel: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  pillValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
})
