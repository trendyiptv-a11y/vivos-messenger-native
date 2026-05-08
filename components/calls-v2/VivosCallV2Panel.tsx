import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useVivosCallV2 } from "@/lib/calls-v2/useVivosCallV2"
import { NativeVideoSurface } from "@/components/messenger/NativeVideoSurface"

type Props = {
  conversationId: string
  userId: string | null
  remoteUserId: string | null
  remoteName: string
}

export function VivosCallV2Panel({ conversationId, userId, remoteUserId, remoteName }: Props) {
  const {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    reset,
    toggleMicrophone,
    toggleCamera,
    toggleSpeaker,
    switchLocalCamera,
  } = useVivosCallV2({
    conversationId,
    userId,
    remoteUserId,
    remoteName,
  })

  const idle =
    callState.status === "idle" ||
    callState.status === "ended" ||
    callState.status === "rejected" ||
    callState.status === "failed"

  const incoming = callState.status === "ringing_incoming"
  const outgoing = callState.status === "ringing_outgoing"
  const connecting = callState.status === "connecting"
  const connected = callState.status === "connected"
  const videoCall = callState.callType === "video"

  if (idle) {
    return (
      <View style={styles.startBar}>
        <View style={styles.startTextBlock}>
          <Text style={styles.startTitle}>Apel VIVOS</Text>
          <Text style={styles.startSubtitle}>{remoteName || "Membru VIVOS"}</Text>
        </View>

        <View style={styles.startButtons}>
          <RoundButton icon="call-outline" onPress={() => startCall("audio")} />
          <RoundButton icon="videocam-outline" onPress={() => startCall("video")} primary />
        </View>
      </View>
    )
  }

  if (incoming) {
    return (
      <View style={styles.callCard}>
        <View style={styles.incomingHeader}>
          <View style={styles.avatarCircle}>
            <Ionicons name={videoCall ? "videocam-outline" : "call-outline"} size={28} color="white" />
          </View>

          <Text style={styles.callTitle}>
            {videoCall ? "Apel video primit" : "Apel audio primit"}
          </Text>

          <Text style={styles.callSubtitle}>{remoteName || "Membru VIVOS"}</Text>
        </View>

        <View style={styles.incomingActions}>
          <CallButton icon="close-outline" label="Respinge" onPress={rejectCall} danger />
          <CallButton icon="call-outline" label="Acceptă" onPress={acceptCall} success />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.callCard}>
      <View style={styles.callHeader}>
        <View>
          <Text style={styles.callTitle}>
            {connected ? "Apel conectat" : outgoing ? "Se apelează..." : "Se conectează..."}
          </Text>
          <Text style={styles.callSubtitle}>{remoteName || "Membru VIVOS"}</Text>
        </View>

        <Pressable onPress={reset} style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
          <Ionicons name="refresh-outline" size={18} color="white" />
        </Pressable>
      </View>

      {videoCall ? (
        <View style={styles.videoArea}>
          <View style={styles.remoteVideo}>
            {callState.remoteStreamURL ? (
              <NativeVideoSurface label={remoteName || "Remote"} streamURL={callState.remoteStreamURL} fill />
            ) : (
              <View style={styles.emptyVideo}>
                <Ionicons name="videocam-outline" size={34} color="rgba(255,255,255,0.55)" />
                <Text style={styles.emptyVideoText}>
                  {connecting || outgoing ? "Aștept video..." : "Fără video remote"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.localPreview}>
            {callState.localStreamURL ? (
              <NativeVideoSurface label="Tu" streamURL={callState.localStreamURL} fill />
            ) : (
              <View style={styles.localPreviewEmpty}>
                <Ionicons name="person-outline" size={20} color="white" />
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.audioArea}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person-outline" size={44} color="white" />
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
          onPress={toggleMicrophone}
          active={callState.microphoneEnabled}
        />

        <ControlButton
          icon={callState.speakerEnabled ? "volume-high-outline" : "volume-mute-outline"}
          label={callState.speakerEnabled ? "Speaker" : "Speaker off"}
          onPress={toggleSpeaker}
          active={callState.speakerEnabled}
        />

        {videoCall ? (
          <>
            <ControlButton
              icon={callState.cameraEnabled ? "videocam-outline" : "videocam-off-outline"}
              label={callState.cameraEnabled ? "Camera" : "Cam off"}
              onPress={toggleCamera}
              active={callState.cameraEnabled}
            />

            <ControlButton
              icon="camera-reverse-outline"
              label="Switch"
              onPress={switchLocalCamera}
              active
            />
          </>
        ) : null}

        <ControlButton icon="call-outline" label="End" onPress={endCall} danger />
      </View>

      {callState.status === "failed" ? (
        <Text style={styles.errorText}>Apelul a eșuat. Apasă Reset și încearcă din nou.</Text>
      ) : null}
    </View>
  )
}

function RoundButton({
  icon,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void | Promise<void>
  primary?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundButton,
        primary && styles.roundButtonPrimary,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color="white" />
    </Pressable>
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
      <Ionicons name={icon} size={24} color="white" />
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
  startBar: {
    marginHorizontal: 14,
    marginVertical: 10,
    borderRadius: 24,
    padding: 14,
    backgroundColor: "rgba(8,12,24,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  startTextBlock: {
    flex: 1,
  },
  startTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
  },
  startSubtitle: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    marginTop: 2,
  },
  startButtons: {
    flexDirection: "row",
    gap: 10,
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  roundButtonPrimary: {
    backgroundColor: "#2563EB",
  },
  callCard: {
    marginHorizontal: 14,
    marginVertical: 10,
    borderRadius: 28,
    padding: 14,
    backgroundColor: "rgba(8,12,24,0.97)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    gap: 14,
  },
  callHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  callTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  callSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    marginTop: 3,
    textAlign: "center",
  },
  smallButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  incomingHeader: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  incomingActions: {
    flexDirection: "row",
    gap: 12,
  },
  callButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 20,
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
    fontSize: 13,
    fontWeight: "900",
  },
  videoArea: {
    height: 320,
    borderRadius: 24,
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
    width: 104,
    height: 140,
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
    fontSize: 13,
    fontWeight: "800",
  },
  audioArea: {
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  avatarLarge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  audioName: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
  },
  audioStatus: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 14,
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
    minHeight: 50,
    borderRadius: 17,
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
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
})
