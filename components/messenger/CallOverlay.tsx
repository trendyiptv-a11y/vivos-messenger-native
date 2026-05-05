import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { CallUiState, CallType } from "@/types/call"
import {
  toggleWebRtcCamera,
  toggleWebRtcMicrophone,
  toggleWebRtcSpeaker,
  switchWebRtcCamera,
  WebRtcManagerState,
} from "@/lib/calls/webrtc"
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
  if (callUiState === "outgoing") return callType === "video" ? "Se apelează..." : "Se apelează audio..."
  return callType === "video" ? "Apel video conectat" : "Apel audio conectat"
}

type ControlButtonVariant = "neutral" | "accept" | "danger" | "accent" | "muted"

type ControlButtonProps = {
  icon: keyof typeof Ionicons.glyphMap
  onPress?: () => void
  variant?: ControlButtonVariant
  disabled?: boolean
  large?: boolean
  active?: boolean
}

function ControlButton({ icon, onPress, variant = "neutral", disabled = false, large = false, active = true }: ControlButtonProps) {
  const isDisabled = disabled || !onPress

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: "rgba(255,255,255,0.20)", borderless: true, radius: large ? 42 : 36 }}
      style={({ pressed }) => [
        styles.controlButton,
        large && styles.controlButtonLarge,
        variant === "accept" && styles.controlButtonAccept,
        variant === "danger" && styles.controlButtonDanger,
        variant === "accent" && styles.controlButtonAccent,
        variant === "muted" && styles.controlButtonMuted,
        !active && styles.controlButtonInactive,
        isDisabled && styles.controlButtonDisabled,
        pressed && styles.controlButtonPressed,
      ]}
    >
      <Ionicons name={icon} size={large ? 31 : 24} color={active ? "white" : "#D1D5DB"} />
    </Pressable>
  )
}

function CallingPulse() {
  return (
    <View style={styles.pulseDots}>
      <View style={[styles.pulseDot, styles.pulseDotActive]} />
      <View style={styles.pulseDot} />
      <View style={styles.pulseDot} />
    </View>
  )
}

function CallSymbol({ callType }: { callType: CallType }) {
  return (
    <View style={styles.symbolWrap}>
      <View style={styles.symbolRingOuter} />
      <View style={styles.symbolRingMiddle} />
      <View style={styles.symbolRingInner} />
      <View style={styles.symbolIconCard}>
        <Ionicons name={callType === "video" ? "videocam" : "call"} size={42} color="#B5A7FF" />
      </View>
    </View>
  )
}

export function CallOverlay({
  visible,
  otherName,
  callUiState,
  currentCallType,
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
  const mainVideoURL = remoteURL || (isVideo ? localURL : null)
  const showPreview = isVideo && Boolean(localURL)
  const isIncoming = callUiState === "incoming"
  const isConnected = callUiState === "connected"
  const micEnabled = currentWebRtcState?.microphoneEnabled ?? true
  const cameraEnabled = currentWebRtcState?.cameraEnabled ?? isVideo
  const speakerEnabled = currentWebRtcState?.speakerEnabled ?? isVideo

  return (
    <View style={styles.overlay}>
      <View style={styles.darkBase} />
      <View style={styles.glowBottom} />
      <View style={styles.glowCenter} />

      {isVideo && mainVideoURL && remoteURL ? (
        <View style={styles.fullVideo}>
          <NativeVideoSurface label="Remote" streamURL={mainVideoURL} fill />
        </View>
      ) : null}

      <View style={styles.topShade} />
      <View style={styles.bottomShade} />

      <View style={styles.topBar}>
        <Pressable
          onPress={isIncoming ? onReject : onEnd}
          disabled={callBusy}
          android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: true, radius: 32 }}
          style={({ pressed }) => [styles.topRoundButton, pressed && styles.topRoundButtonPressed]}
        >
          <Ionicons name={isIncoming ? "chevron-down" : "chevron-back"} size={28} color="white" />
        </Pressable>

        <Pressable
          onPress={toggleWebRtcMicrophone}
          android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: true, radius: 32 }}
          style={({ pressed }) => [styles.topRoundButton, !micEnabled && styles.topRoundButtonOff, pressed && styles.topRoundButtonPressed]}
        >
          <Ionicons name={micEnabled ? "mic-outline" : "mic-off-outline"} size={25} color="white" />
        </Pressable>
      </View>

      <View style={styles.identityBlock}>
        <Text numberOfLines={1} style={styles.nameText}>{otherName}</Text>
        <Text numberOfLines={1} style={styles.statusText}>{statusLabel(callUiState, currentCallType)}</Text>
        {!isConnected ? <CallingPulse /> : null}
      </View>

      {showPreview ? (
        <View style={styles.localPreviewCard}>
          {cameraEnabled ? (
            <NativeVideoSurface label="Tu" streamURL={localURL} compact />
          ) : (
            <View style={styles.previewOff}>
              <Ionicons name="videocam-off-outline" size={26} color="rgba(255,255,255,0.8)" />
              <Text style={styles.previewOffText}>Camera oprită</Text>
            </View>
          )}
        </View>
      ) : null}

      {!remoteURL ? (
        <View style={styles.centerSymbolArea}>
          {isVideo && !localURL ? (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initials(otherName)}</Text>
            </View>
          ) : (
            <CallSymbol callType={currentCallType} />
          )}
        </View>
      ) : null}

      <View style={styles.controlDock}>
        <View style={styles.dockHandle} />
        {isIncoming ? (
          <>
            <ControlButton icon={micEnabled ? "mic-outline" : "mic-off-outline"} onPress={toggleWebRtcMicrophone} variant={micEnabled ? "neutral" : "muted"} active={micEnabled} />
            <ControlButton icon={isVideo ? (cameraEnabled ? "videocam-outline" : "videocam-off-outline") : "call-outline"} onPress={isVideo ? toggleWebRtcCamera : undefined} variant={cameraEnabled ? "neutral" : "muted"} active={!isVideo || cameraEnabled} />
            <ControlButton icon={speakerEnabled ? "volume-high-outline" : "volume-mute-outline"} onPress={toggleWebRtcSpeaker} variant={speakerEnabled ? "accent" : "neutral"} active={speakerEnabled} />
            <ControlButton icon="call-outline" onPress={onReject} variant="danger" disabled={callBusy} large />
            <ControlButton icon={isVideo ? "videocam" : "call"} onPress={onAccept} variant="accept" disabled={callBusy} large />
          </>
        ) : (
          <>
            <ControlButton icon={micEnabled ? "mic-outline" : "mic-off-outline"} onPress={toggleWebRtcMicrophone} variant={micEnabled ? "neutral" : "muted"} active={micEnabled} />
            <ControlButton icon={cameraEnabled ? "videocam-outline" : "videocam-off-outline"} onPress={isVideo ? toggleWebRtcCamera : undefined} variant={cameraEnabled ? "neutral" : "muted"} active={!isVideo || cameraEnabled} />
            <ControlButton icon="camera-reverse-outline" onPress={isVideo ? () => { switchWebRtcCamera() } : undefined} variant="neutral" active={isVideo} />
            <ControlButton icon={speakerEnabled ? "volume-high-outline" : "volume-mute-outline"} onPress={toggleWebRtcSpeaker} variant={speakerEnabled ? "accent" : "neutral"} active={speakerEnabled} />
            <ControlButton icon="call-outline" onPress={onEnd} variant="danger" disabled={callBusy} large />
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#02030A",
    zIndex: 50,
    elevation: 50,
    overflow: "hidden",
  },
  darkBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#02030A",
  },
  fullVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "black",
  },
  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  bottomShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  glowBottom: {
    position: "absolute",
    left: -80,
    right: -80,
    bottom: 0,
    height: 260,
    backgroundColor: "rgba(77,76,210,0.24)",
    borderTopLeftRadius: 240,
    borderTopRightRadius: 240,
  },
  glowCenter: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    left: "50%",
    top: "42%",
    marginLeft: -150,
    marginTop: -150,
    backgroundColor: "rgba(123,92,255,0.06)",
  },
  topBar: {
    position: "absolute",
    top: 48,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topRoundButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  topRoundButtonOff: {
    backgroundColor: "rgba(239,68,68,0.24)",
    borderColor: "rgba(248,113,113,0.44)",
  },
  topRoundButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.95 }],
  },
  identityBlock: {
    position: "absolute",
    top: 126,
    left: 26,
    right: 172,
  },
  nameText: {
    color: "white",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  statusText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 18,
    marginTop: 10,
    fontWeight: "600",
  },
  pulseDots: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    alignItems: "center",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(171,153,255,0.65)",
  },
  pulseDotActive: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#9B7CFF",
  },
  localPreviewCard: {
    position: "absolute",
    right: 24,
    top: 138,
    width: 130,
    height: 176,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.26)",
    shadowColor: "#8C78FF",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  previewOff: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.54)",
  },
  previewOffText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
  },
  centerSymbolArea: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  symbolWrap: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  symbolRingOuter: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: "rgba(151,127,255,0.10)",
  },
  symbolRingMiddle: {
    position: "absolute",
    width: 208,
    height: 208,
    borderRadius: 104,
    borderWidth: 1.5,
    borderColor: "rgba(151,127,255,0.20)",
  },
  symbolRingInner: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: "rgba(151,127,255,0.32)",
  },
  symbolIconCard: {
    width: 92,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(40,38,92,0.88)",
    borderWidth: 1,
    borderColor: "rgba(159,132,255,0.52)",
  },
  avatarFallback: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(154,113,193,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  avatarFallbackText: {
    color: "white",
    fontSize: 38,
    fontWeight: "900",
  },
  controlDock: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 28,
    minHeight: 108,
    borderRadius: 38,
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(8,9,18,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#7F70FF",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  dockHandle: {
    position: "absolute",
    top: 10,
    left: "50%",
    width: 48,
    height: 5,
    marginLeft: -24,
    borderRadius: 999,
    backgroundColor: "rgba(151,127,255,0.68)",
  },
  controlButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  controlButtonLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  controlButtonAccept: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOpacity: 0.34,
  },
  controlButtonDanger: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOpacity: 0.34,
  },
  controlButtonAccent: {
    backgroundColor: "rgba(37,99,235,0.68)",
    borderColor: "rgba(96,165,250,0.72)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.25,
  },
  controlButtonMuted: {
    backgroundColor: "rgba(239,68,68,0.20)",
    borderColor: "rgba(248,113,113,0.42)",
  },
  controlButtonInactive: {
    opacity: 0.68,
  },
  controlButtonDisabled: {
    opacity: 0.46,
  },
  controlButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.94 }],
  },
})
