import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { theme } from "@/lib/theme"
import { CallUiState, CallType } from "@/types/call"
import { WebRtcManagerState } from "@/lib/calls/webrtc"

type Props = {
  visible: boolean
  otherName: string
  callUiState: CallUiState
  currentCallType: CallType
  mediaReady: boolean
  webrtcStatus: string
  currentWebRtcState: WebRtcManagerState | null
  callBusy: boolean
  onAccept: () => void
  onReject: () => void
  onEnd: () => void
}

export function CallOverlay({
  visible,
  otherName,
  callUiState,
  currentCallType,
  mediaReady,
  webrtcStatus,
  currentWebRtcState,
  callBusy,
  onAccept,
  onReject,
  onEnd,
}: Props) {
  if (!visible) return null

  return (
    <View style={styles.callOverlay}>
      <View style={styles.callCard}>
        <View style={styles.callAvatarCircle}>
          <Text style={styles.callAvatarText}>{otherName.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.callName}>{otherName}</Text>
        <Text style={styles.callStatus}>
          {callUiState === "incoming"
            ? currentCallType === "video"
              ? "Apel video primit"
              : "Apel audio primit"
            : callUiState === "outgoing"
              ? currentCallType === "video"
                ? "Se apelează video..."
                : "Se apelează audio..."
              : currentCallType === "video"
                ? "Apel video conectat"
                : "Apel audio conectat"}
        </Text>
        <Text style={styles.callMediaHint}>{mediaReady ? "Media pregătită pentru următorul pas WebRTC" : "Se pregătește media nativă..."}</Text>
        <Text style={styles.callMediaHint}>WebRTC: {webrtcStatus}</Text>
        <Text style={styles.callMediaHint}>Descriere locală: {currentWebRtcState?.localDescription?.type ?? "—"}</Text>
        <Text style={styles.callMediaHint}>Descriere remote: {currentWebRtcState?.remoteDescription?.type ?? "—"}</Text>
        <Text style={styles.callMediaHint}>ICE remote: {currentWebRtcState?.remoteCandidates.length ?? 0}</Text>
        <Text style={styles.callMediaHint}>ICE local: {currentWebRtcState?.localCandidates.length ?? 0}</Text>
        <Text style={styles.callMediaHint}>TURN servers: {currentWebRtcState?.iceServers.length ?? 0}</Text>
        <Text style={styles.callMediaHint}>Local stream: {currentWebRtcState?.localStreamReady ? "da" : "nu"}</Text>
        <Text style={styles.callMediaHint}>Remote stream: {currentWebRtcState?.remoteStreamReady ? "da" : "nu"}</Text>
        {currentWebRtcState?.diagnostics?.length ? (
          <View style={styles.diagList}>
            {currentWebRtcState.diagnostics.map((item, index) => (
              <Text key={`${item}-${index}`} style={styles.diagItem}>• {item}</Text>
            ))}
          </View>
        ) : null}

        {callUiState === "incoming" ? (
          <View style={styles.callActionsRow}>
            <Pressable onPress={onAccept} disabled={callBusy} style={[styles.callActionButton, styles.callAcceptButton]}>
              <Ionicons name="call" size={20} color="white" />
              <Text style={styles.callActionText}>Răspunde</Text>
            </Pressable>
            <Pressable onPress={onReject} disabled={callBusy} style={[styles.callActionButton, styles.callRejectButton]}>
              <Ionicons name="call-outline" size={20} color="white" />
              <Text style={styles.callActionText}>Respinge</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={onEnd} disabled={callBusy} style={[styles.callActionButton, styles.callRejectButton, styles.callEndSingle]}>
            <Ionicons name="call-outline" size={20} color="white" />
            <Text style={styles.callActionText}>{callUiState === "connected" ? "Închide apelul" : "Anulează apelul"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  callOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,10,20,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  callCard: {
    width: "100%",
    borderRadius: 30,
    padding: 24,
    backgroundColor: "rgba(18,46,84,0.98)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  callAvatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(154,113,193,0.65)",
  },
  callAvatarText: {
    color: "white",
    fontSize: 30,
    fontWeight: "800",
  },
  callName: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 18,
  },
  callStatus: {
    color: theme.colors.textSoft,
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  callMediaHint: {
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
  callActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    width: "100%",
  },
  callActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 54,
    borderRadius: 20,
    paddingHorizontal: 18,
    flex: 1,
  },
  callAcceptButton: {
    backgroundColor: "#0F9D58",
  },
  callRejectButton: {
    backgroundColor: "#D93025",
  },
  callEndSingle: {
    marginTop: 24,
    width: "100%",
  },
  callActionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
})
