import { StyleSheet, Text, View } from "react-native"
import { WebRtcManagerState } from "@/lib/calls/webrtc"
import { theme } from "@/lib/theme"

type Props = {
  webrtcStatus: string
  mediaReady: boolean
  state: WebRtcManagerState | null
}

export function CallDiagnosticsCard({ webrtcStatus, mediaReady, state }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.line}>{mediaReady ? "Media pregătită pentru următorul pas WebRTC" : "Se pregătește media nativă..."}</Text>
      <Text style={styles.line}>WebRTC: {webrtcStatus}</Text>
      <Text style={styles.line}>Descriere locală: {state?.localDescription?.type ?? "—"}</Text>
      <Text style={styles.line}>Descriere remote: {state?.remoteDescription?.type ?? "—"}</Text>
      <Text style={styles.line}>ICE remote: {state?.remoteCandidates.length ?? 0}</Text>
      <Text style={styles.line}>ICE local: {state?.localCandidates.length ?? 0}</Text>
      <Text style={styles.line}>TURN servers: {state?.iceServers.length ?? 0}</Text>
      <Text style={styles.line}>Local stream: {state?.localStreamReady ? "da" : "nu"}</Text>
      <Text style={styles.line}>Remote stream: {state?.remoteStreamReady ? "da" : "nu"}</Text>
      {state?.diagnostics?.length ? (
        <View style={styles.diagList}>
          {state.diagnostics.map((item, index) => (
            <Text key={`${item}-${index}`} style={styles.diagItem}>• {item}</Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    alignSelf: "stretch",
  },
  line: {
    color: theme.colors.textDim,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  diagList: {
    marginTop: 10,
    alignSelf: "stretch",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 4,
  },
  diagItem: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
})
