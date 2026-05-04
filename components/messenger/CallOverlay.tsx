import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { theme } from "@/lib/theme"
import { CallUiState, CallType } from "@/types/call"
import { WebRtcManagerState } from "@/lib/calls/webrtc"
import { CallDiagnosticsCard } from "@/components/messenger/CallDiagnosticsCard"
import { NativeVideoSurface } from "@/components/messenger/NativeVideoSurface"

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

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "VI"
}

function statusLabel(callUiState: CallUiState, callType: CallType) {
  if (callUiState === "incoming") return callType === "video" ? "Apel video primit" : "Apel audio primit"
  if (callUiState === "outgoing") return callType === "video" ? "Se apelează video..." : "Se apelează audio..."
  return callType === "video" ? "Apel video conectat" : "Apel audio conectat"
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

  const isVideo = currentCallType === "video"
  const remoteURL = currentWebRtcState?.remoteStreamURL ?? null
  const localURL = currentWebRtcState?.localStreamURL ?? null

  return (
    <View style={styles.callOverlay}>
      <View style={[styles.callCard, isVideo && styles.videoCard]}>
        {isVideo ? (
          <View style={styles.videoStage}>
            {remoteURL ? (
              <NativeVideoSurface label="Remote" streamURL={remoteURL} />
            ) : (
              <View style={styles.remoteWaiting}>
                <View style={styles.callAvatarCircle}>
                  <Text style={styles.callAvatarText}>{initials(otherName)}</Text>
                </View>
                <Text style={styles.callName}>{otherName}</Text>
                <Text style={styles.callStatus}>{statusLabel(callUiState, currentCallType)}</Text>
              </View>
            )}

            {localURL ? (
              <View style={styles.localPreview}>
                <NativeVideoSurface label="Tu" streamURL={localURL} compact />
              </View>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.callAvatarCircle}>
              <Text style={styles.callAvatarText}>{initials(otherName)}</Text>
            </View>
            <Text style={styles.callName}>{otherName}</Text>
            <Text style={styles.callStatus}>{statusLabel(callUiState, currentCallType)}</Text>
          </>
        )}

        <CallDiagnosticsCard webrtcStatus={webrtcStatus} mediaReady={mediaReady} state={currentWebRtcState} />

        {callUiState === "incoming" ? (
          <View style={styles.callActionsRow}>
            <Pressable onPress={onReject} disabled={callBusy} style={[styles.roundActionButton, styles.rejectRound]}>
              <Ionicons name="call-outline" size={24} color="white" />
            </Pressable>
            <Pressable onPress={onAccept} disabled={callBusy} style={[styles.roundActionButton, styles.acceptRound]}>
              <Ionicons name={isVideo ? "videocam" : "call"} size={24} color="white" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.callActionsRow}>
            <Pressable onPress={onEnd} disabled={callBusy} style={[styles.roundActionButton, styles.rejectRound]}>
              <Ionicons name="call-outline" size={24} color="white" />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  callOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    zIndex: 50,
    elevation: 50,
  },
  callCard: {
    width: "100%",
    borderRadius: 32,
    padding: 22,
    backgroundColor: "rgba(18,46,84,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
  },
  videoCard: {
    padding: 14,
  },
  videoStage: {
    width: "100%",
    minHeight: 330,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  remoteWaiting: {
    width: "100%",
    minHeight: 330,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  localPreview: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 108,
    height: 148,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "black",
  },
  callAvatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(154,113,193,0.75)",
  },
  callAvatarText: {
    color: "white",
    fontSize: 32,
    fontWeight: "900",
  },
  callName: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 18,
    textAlign: "center",
  },
  callStatus: {
    color: theme.colors.textSoft,
    fontSize: 16,
    marginTop: 9,
    textAlign: "center",
  },
  callActionsRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  roundActionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  acceptRound: {
    backgroundColor: "#0F9D58",
  },
  rejectRound: {
    backgroundColor: "#D93025",
  },
})
