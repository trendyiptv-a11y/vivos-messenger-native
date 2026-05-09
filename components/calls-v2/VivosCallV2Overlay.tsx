import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { NativeVideoSurface } from "@/components/messenger/NativeVideoSurface"
import { VivosCallRuntimeState } from "@/lib/calls-v2/types"

type Props = {
  callState: VivosCallRuntimeState
  remoteName: string
  onAccept: () => void | Promise<void>
  onReject: () => void | Promise<void>
  onEnd: () => void | Promise<void>
  onReset: () => void | Promise<void>
  onToggleMicrophone: () => void | Promise<void>
  onToggleCamera: () => void | Promise<void>
  onToggleSpeaker: () => void | Promise<void>
  onSwitchCamera: () => void | Promise<void>
}

export function VivosCallV2Overlay({
  callState,
  remoteName,
  onAccept,
  onReject,
  onEnd,
  onReset,
  onToggleMicrophone,
  onToggleCamera,
  onToggleSpeaker,
  onSwitchCamera,
}: Props) {
  const visible =
    callState.status !== "idle" &&
    callState.status !== "ended" &&
    callState.status !== "rejected" &&
    callState.status !== "failed"

  if (!visible) return null

  const incoming = callState.status === "ringing_incoming"
  const outgoing = callState.status === "ringing_outgoing"
  const connecting = callState.status === "connecting"
  const connected = callState.status === "connected"
  const videoCall = callState.callType === "video"

  if (incoming) {
    return (
      <View style={styles.overlay}>
        <View style={styles.incomingCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name={videoCall ? "videocam-outline" : "call-outline"} size={34} color="white" />
          </View>

          <Text style={styles.title}>{videoCall ? "Apel video primit" : "Apel audio primit"}</Text>
          <Text style={styles.subtitle}>{remoteName || "Membru VIVOS"}</Text>

          <View style={styles.incomingActions}>
            <CallButton icon="close-outline" label="Respinge" onPress={onReject} danger />
            <CallButton icon="call-outline" label="Acceptă" onPress={onAccept} success />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.callShell}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>
              {connected ? "Apel conectat" : outgoing ? "Se apelează..." : connecting ? "Se conectează..." : "Apel VIVOS"}
            </Text>
            <Text style={styles.subtitle}>{remoteName || "Membru VIVOS"}</Text>
          </View>

          <Pressable onPress={onReset} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
            <Ionicons name="refresh-outline" size={19} color="white" />
          </Pressable>
        </View>

        {videoCall ? (
          <View style={styles.videoArea}>
            <View style={styles.remoteVideo}>
              {callState.remoteStreamURL ? (
                <NativeVideoSurface
                  key={`remote-video-${callState.remoteStreamURL}`}
                  label={remoteName || "Remote"}
                  streamURL={callState.remoteStreamURL}
                  fill
                />
              ) : (
                <View style={styles.emptyVideo}>
                  <Ionicons name="videocam-outline" size={42} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.emptyVideoText}>
                    {connecting || outgoing ? "Aștept video..." : "Fără video remote"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.localPreview}>
              {callState.localStreamURL ? (
                <NativeVideoSurface
                  key={`local-preview-${callState.localStreamURL}`}
                  label="Tu"
                  streamURL={callState.localStreamURL}
                  fill
                  compact
                />
              ) : (
                <View style={styles.localPreviewEmpty}>
                  <Ionicons name="person-outline" size={22} color="white" />
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.audioArea}>
            <View style={styles.audioAvatar}>
              <Ionicons name="person-outline" size={52} color="white" />
            </View>
            <Text style={styles.audioName}>{remoteName || "Membru VIVOS"}</Text>
            <Text style={styles.audioStatus}>
              {connected ? "Audio conectat" : outgoing ? "Se apelează..." : "Se conectează..."}
            </Text>
          </View>
        )}

        <View style={styles.controls}>
          <ControlButton
            icon={callState.microphoneEnabled ? "mic-outline" : "mic-off-outline"}
            label={callState.microphoneEnabled ? "Mic" : "Mic off"}
            onPress={onToggleMicrophone}
            active={callState.microphoneEnabled}
          />

          <ControlButton
            icon={callState.speakerEnabled ? "volume-high-outline" : "volume-mute-outline"}
            label={callState.speakerEnabled ? "Speaker" : "Speaker off"}
            onPress={onToggleSpeaker}
            active={callState.speakerEnabled}
          />

          {videoCall ? (
            <>
              <ControlButton
                icon={callState.cameraEnabled ? "videocam-outline" : "videocam-off-outline"}
                label={callState.cameraEnabled ? "Camera" : "Cam off"}
                onPress={onToggleCamera}
                active={callState.cameraEnabled}
              />

              <ControlButton
                icon="camera-reverse-outline"
                label="Switch"
                onPress={onSwitchCamera}
                active
              />
            </>
          ) : null}

          <ControlButton icon="call-outline" label="End" onPress={onEnd} danger />
        </View>
      </View>
    </View>
  )
}

function CallButton({
  icon,
  label,
  onPress,
  danger = false,
  success = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void | Promise<void>
  danger?: boolean
  success?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.callButton,
        danger && styles.buttonDanger,
        success && styles.buttonSuccess,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={26} color="white" />
      <Text style={styles.callButtonText}>{label}</Text>
    </Pressable>
  )
}

function ControlButton({
  icon,
  label,
  onPress,
  active = false,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void | Promise<void>
  active?: boolean
  danger?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        active && styles.controlButtonActive,
        danger && styles.controlButtonDanger,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color="white" />
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: "rgba(6,12,24,0.88)",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  incomingCard: {
    borderRadius: 30,
    padding: 22,
    backgroundColor: "rgba(8,12,24,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    gap: 12,
  },
  callShell: {
    flex: 1,
    borderRadius: 30,
    padding: 14,
    backgroundColor: "rgba(8,12,24,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    gap: 14,
  },
  topBar: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  resetButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  incomingActions: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  callButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  buttonDanger: {
    backgroundColor: "#EF4444",
  },
  buttonSuccess: {
    backgroundColor: "#22C55E",
  },
  callButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },
  videoArea: {
    flex: 1,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#02030A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  remoteVideo: {
    flex: 1,
  },
  localPreview: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 112,
    height: 152,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  localPreviewEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyVideo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyVideoText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    fontWeight: "800",
  },
  audioArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  audioAvatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  audioName: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
  },
  audioStatus: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 15,
    fontWeight: "700",
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  controlButton: {
    minWidth: "30%",
    flexGrow: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  controlButtonActive: {
    backgroundColor: "#2563EB",
  },
  controlButtonDanger: {
    backgroundColor: "#EF4444",
  },
  controlText: {
    color: "white",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
})
