import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
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
    switchLocalCamera,
    refreshSnapshots,
  } = useVivosCallV2({
    conversationId,
    userId,
    remoteUserId,
    remoteName,
  })

  const inCall =
    callState.status !== "idle" &&
    callState.status !== "ended" &&
    callState.status !== "rejected" &&
    callState.status !== "failed"

  const incoming = callState.status === "ringing_incoming"

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="videocam-outline" size={20} color="white" />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>VIVOS Call V2</Text>
          <Text style={styles.subtitle}>{remoteName || "Membru VIVOS"}</Text>
        </View>

        <Pressable onPress={refreshSnapshots} style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}>
          <Ionicons name="refresh" size={18} color="white" />
        </Pressable>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Status</Text>
        <Text style={styles.statusValue}>{callState.status}</Text>

        <View style={styles.statusGrid}>
          <MiniStat label="Local" value={callState.localStreamReady ? "ON" : "OFF"} />
          <MiniStat label="Remote" value={callState.remoteStreamReady ? "ON" : "OFF"} />
          <MiniStat label="Mic" value={callState.microphoneEnabled ? "ON" : "OFF"} />
          <MiniStat label="Cam" value={callState.cameraEnabled ? "ON" : "OFF"} />
        </View>
      </View>

      <View style={styles.videoGrid}>
        <View style={styles.videoCard}>
          <Text style={styles.videoTitle}>Local</Text>
          {callState.localStreamURL ? (
            <NativeVideoSurface label="Tu" streamURL={callState.localStreamURL} fill />
          ) : (
            <EmptyVideo label="Fără local stream" icon="person-circle-outline" />
          )}
        </View>

        <View style={styles.videoCard}>
          <Text style={styles.videoTitle}>Remote</Text>
          {callState.remoteStreamURL ? (
            <NativeVideoSurface label={remoteName || "Remote"} streamURL={callState.remoteStreamURL} fill />
          ) : (
            <EmptyVideo label="Fără remote stream" icon="radio-outline" />
          )}
        </View>
      </View>

      <View style={styles.controls}>
        {!inCall ? (
          <>
            <ActionButton icon="call-outline" label="Start audio" onPress={() => startCall("audio")} />
            <ActionButton icon="videocam-outline" label="Start video" onPress={() => startCall("video")} />
          </>
        ) : incoming ? (
          <>
            <ActionButton icon="call-outline" label="Acceptă" onPress={acceptCall} success />
            <ActionButton icon="close-outline" label="Respinge" onPress={rejectCall} danger />
          </>
        ) : (
          <>
            <ActionButton
              icon={callState.microphoneEnabled ? "mic-off-outline" : "mic-outline"}
              label={callState.microphoneEnabled ? "Mic OFF" : "Mic ON"}
              onPress={toggleMicrophone}
            />
            <ActionButton
              icon={callState.cameraEnabled ? "videocam-off-outline" : "videocam-outline"}
              label={callState.cameraEnabled ? "Cam OFF" : "Cam ON"}
              onPress={toggleCamera}
            />
            <ActionButton icon="camera-reverse-outline" label="Switch" onPress={switchLocalCamera} />
            <ActionButton icon="call-outline" label="End" onPress={endCall} danger />
          </>
        )}

        <ActionButton icon="reload-outline" label="Reset" onPress={reset} muted />
      </View>

      <View style={styles.diagnosticsBox}>
        <Text style={styles.diagnosticsTitle}>Diagnostics</Text>

        <ScrollView style={styles.diagnosticsScroll} nestedScrollEnabled>
          {callState.diagnostics.length ? (
            callState.diagnostics.slice(-12).map((item, index) => (
              <Text key={`${item}-${index}`} style={styles.diagnosticLine}>
                • {item}
              </Text>
            ))
          ) : (
            <Text style={styles.diagnosticLine}>Niciun diagnostic încă.</Text>
          )}
        </ScrollView>
      </View>
    </View>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  )
}

function EmptyVideo({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.emptyVideo}>
      <Ionicons name={icon} size={30} color="rgba(255,255,255,0.55)" />
      <Text style={styles.emptyVideoText}>{label}</Text>
    </View>
  )
}

function ActionButton({
  icon,
  label,
  onPress,
  danger = false,
  success = false,
  muted = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void | Promise<void>
  danger?: boolean
  success?: boolean
  muted?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        danger && styles.actionDanger,
        success && styles.actionSuccess,
        muted && styles.actionMuted,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={19} color="white" />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 14,
    marginVertical: 10,
    borderRadius: 26,
    padding: 14,
    backgroundColor: "rgba(8,12,24,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    marginTop: 2,
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  statusBox: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statusLabel: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "800",
  },
  statusValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  statusGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  miniStat: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  miniStatLabel: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 10,
    fontWeight: "800",
  },
  miniStatValue: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  videoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  videoCard: {
    flex: 1,
    height: 170,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#02030A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  videoTitle: {
    position: "absolute",
    left: 8,
    top: 8,
    zIndex: 2,
    color: "white",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.50)",
  },
  emptyVideo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 10,
  },
  emptyVideoText: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    minWidth: "30%",
    flexGrow: 1,
    minHeight: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    backgroundColor: "#2563EB",
  },
  actionDanger: {
    backgroundColor: "#EF4444",
  },
  actionSuccess: {
    backgroundColor: "#22C55E",
  },
  actionMuted: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  actionText: {
    color: "white",
    fontSize: 11,
    fontWeight: "900",
  },
  diagnosticsBox: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  diagnosticsTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },
  diagnosticsScroll: {
    maxHeight: 120,
  },
  diagnosticLine: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
})
