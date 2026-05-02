import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { theme } from "@/lib/theme"
import { CallUiState, CallType } from "@/types/call"
import { WebRtcManagerState } from "@/lib/calls/webrtc"
import { CallDiagnosticsCard } from "@/components/messenger/CallDiagnosticsCard"
import { VideoPreviewPlaceholder } from "@/components/messenger/VideoPreviewPlaceholder"

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

  const showVideoSlots = currentCallType === "video"

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

        {showVideoSlots ? (
          <View style={styles.previewWrap}>
            <VideoPreviewPlaceholder
              label="Preview remote"
              ready={Boolean(currentWebRtcState?.remoteStreamReady)}
              streamURL={currentWebRtcState?.remoteStreamURL ?? null}
            />
            <VideoPreviewPlaceholder
              label="Preview local"
              ready={Boolean(currentWebRtcState?.localStreamReady)}
              streamURL={currentWebRtcState?.localStreamURL ?? null}
              compact
            />
          </View>
        ) : null}

        <CallDiagnosticsCard webrtcStatus={webrtcStatus} mediaReady={mediaReady} state={currentWebRtcState} />

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
  previewWrap: {
    width: "100%",
    marginTop: 12,
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
