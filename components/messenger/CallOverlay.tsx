import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { theme } from "@/lib/theme"
import { CallUiState, CallType } from "@/types/call"
import { WebRtcManagerState } from "@/lib/calls/webrtc"
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

function shortStatus(state: WebRtcManagerState | null, mediaReady: boolean, webrtcStatus: string) {
  const local = state?.localStreamURL ? "local da" : mediaReady ? "media da" : "media nu"
  const remote = state?.remoteStreamURL ? "remote da" : "remote nu"
  return `${webrtcStatus} · ${local} · ${remote}`
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

  if (isVideo) {
    return (
      <View style={styles.videoOverlay}>
        <View style={styles.videoBackground}>
          {remoteURL ? (
            <NativeVideoSurface label="Remote" streamURL={remoteURL} fill />
          ) : localURL ? (
            <NativeVideoSurface label="Tu" streamURL={localURL} fill />
          ) : (
            <View style={styles.videoWaitingBackground} />
          )}
        </View>

        <View style={styles.videoShadeTop} />
        <View style={styles.videoShadeBottom} />

        <View style={styles.videoHeader}>
          <View style={styles.videoAvatarCircle}>
            <Text style={styles.videoAvatarText}>{initials(otherName)}</Text>
          </View>
          <View style={styles.videoHeaderText}>
            <Text numberOfLines={1} style={styles.videoName}>{otherName}</Text>
            <Text numberOfLines={1} style={styles.videoStatus}>{statusLabel(callUiState, currentCallType)}</Text>
          </View>
        </View>

        {localURL && remoteURL ? (
          <View style={styles.localPreview}>
            <NativeVideoSurface label="Tu" streamURL={localURL} compact />
          </View>
        ) : null}

        {!remoteURL ? (
          <View style={styles.videoCenterCard}>
            <View style={styles.callAvatarCircle}>
              <Text style={styles.callAvatarText}>{initials(otherName)}</Text>
            </View>
            <Text style={styles.callName}>{otherName}</Text>
            <Text style={styles.callStatus}>{statusLabel(callUiState, currentCallType)}</Text>
          </View>
        ) : null}

        <View style={styles.videoDebugChip}>
          <Ionicons name="radio-outline" size={13} color="rgba(255,255,255,0.82)" />
          <Text numberOfLines={1} style={styles.videoDebugText}>{shortStatus(currentWebRtcState, mediaReady, webrtcStatus)}</Text>
        </View>

        {callUiState === "incoming" ? (
          <View style={styles.videoActionsRow}>
            <Pressable onPress={onReject} disabled={callBusy} style={[styles.videoRoundButton, styles.rejectRound]}>
              <Ionicons name="call-outline" size={25} color="white" />
            </Pressable>
            <Pressable onPress={onAccept} disabled={callBusy} style={[styles.videoRoundButton, styles.acceptRound]}>
              <Ionicons name="videocam" size={25} color="white" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.videoActionsRow}>
            <Pressable onPress={onEnd} disabled={callBusy} style={[styles.videoRoundButton, styles.rejectRound]}>
              <Ionicons name="call-outline" size={25} color="white" />
            </Pressable>
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={styles.callOverlay}>
      <View style={styles.callCard}>
        <View style={styles.callAvatarCircle}>
          <Text style={styles.callAvatarText}>{initials(otherName)}</Text>
        </View>
        <Text style={styles.callName}>{otherName}</Text>
        <Text style={styles.callStatus}>{statusLabel(callUiState, currentCallType)}</Text>

        <View style={styles.audioStatusCard}>
          <Ionicons name="radio-outline" size={16} color={theme.colors.textSoft} />
          <Text style={styles.audioStatusText}>{shortStatus(currentWebRtcState, mediaReady, webrtcStatus)}</Text>
        </View>

        {callUiState === "incoming" ? (
          <View style={styles.callActionsRow}>
            <Pressable onPress={onReject} disabled={callBusy} style={[styles.roundActionButton, styles.rejectRound]}>
              <Ionicons name="call-outline" size={24} color="white" />
            </Pressable>
            <Pressable onPress={onAccept} disabled={callBusy} style={[styles.roundActionButton, styles.acceptRound]}>
              <Ionicons name="call" size={24} color="white" />
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
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
    zIndex: 50,
    elevation: 50,
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
  },
  videoWaitingBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F2D52",
  },
  videoShadeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 160,
    backgroundColor: "rgba(2,6,23,0.50)",
  },
  videoShadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 230,
    backgroundColor: "rgba(2,6,23,0.58)",
  },
  videoHeader: {
    position: "absolute",
    top: 46,
    left: 22,
    right: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  videoAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(154,113,193,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  videoAvatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },
  videoHeaderText: {
    flex: 1,
  },
  videoName: {
    color: "white",
    fontSize: 21,
    fontWeight: "900",
  },
  videoStatus: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    marginTop: 3,
    fontWeight: "600",
  },
  videoCenterCard: {
    position: "absolute",
    left: 28,
    right: 28,
    top: "31%",
    alignItems: "center",
    borderRadius: 30,
    padding: 22,
    backgroundColor: "rgba(18,46,84,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  localPreview: {
    position: "absolute",
    right: 20,
    top: 112,
    width: 108,
    height: 148,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "black",
  },
  videoDebugChip: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 110,
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(2,6,23,0.48)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  videoDebugText: {
    flex: 1,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "600",
  },
  videoActionsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 34,
    flexDirection: "row",
    justifyContent: "center",
    gap: 28,
  },
  videoRoundButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
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
  audioStatusCard: {
    marginTop: 22,
    width: "100%",
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  audioStatusText: {
    flex: 1,
    color: theme.colors.textSoft,
    fontSize: 13,
    fontWeight: "600",
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
