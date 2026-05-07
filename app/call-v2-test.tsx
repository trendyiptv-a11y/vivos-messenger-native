import { useMemo } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useVivosCallMedia } from "@/lib/calls-v2/useVivosCallMedia"
import { NativeVideoSurface } from "@/components/messenger/NativeVideoSurface"
import { theme } from "@/lib/theme"

export default function CallV2TestScreen() {
  const router = useRouter()
  const {
    mediaState,
    start,
    stop,
    toggleMicrophone,
    toggleCamera,
    switchLocalCamera,
    refreshSnapshot,
  } = useVivosCallMedia()

  const hasLocalVideo = Boolean(mediaState.localStreamURL && mediaState.videoTracks > 0)
  const hasLocalAudio = mediaState.audioTracks > 0

  const statusText = useMemo(() => {
    if (mediaState.loading) return "Se pornește media..."
    if (mediaState.error) return `Eroare: ${mediaState.error}`
    if (hasLocalVideo) return "Video local activ"
    if (hasLocalAudio) return "Audio local activ"
    return "Media oprită"
  }, [mediaState.loading, mediaState.error, hasLocalVideo, hasLocalAudio])

  async function handleStartAudio() {
    await start("audio").catch((error) => {
      console.warn("Start audio failed", error)
    })
  }

  async function handleStartVideo() {
    await start("video").catch((error) => {
      console.warn("Start video failed", error)
    })
  }

  async function handleStop() {
    await stop().catch((error) => {
      console.warn("Stop media failed", error)
    })
  }

  async function handleToggleCamera() {
    await toggleCamera().catch((error) => {
      console.warn("Toggle camera failed", error)
    })
  }

  async function handleSwitchCamera() {
    await switchLocalCamera().catch((error) => {
      console.warn("Switch camera failed", error)
    })
  }

  function handleToggleMicrophone() {
    try {
      toggleMicrophone()
    } catch (error) {
      console.warn("Toggle microphone failed", error)
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </Pressable>

          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>VIVOS Call V2 Test</Text>
            <Text style={styles.subtitle}>Test local cameră / microfon</Text>
          </View>

          <Pressable
            onPress={refreshSnapshot}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="refresh" size={22} color="white" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.previewCard}>
            {mediaState.localStreamURL ? (
              <NativeVideoSurface label="Preview local" streamURL={mediaState.localStreamURL} fill />
            ) : (
              <View style={styles.emptyPreview}>
                <Ionicons name="videocam-outline" size={46} color="rgba(255,255,255,0.55)" />
                <Text style={styles.emptyPreviewText}>Niciun stream local</Text>
              </View>
            )}
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Status</Text>
            <Text style={styles.statusText}>{statusText}</Text>

            <View style={styles.grid}>
              <InfoBox label="Audio tracks" value={String(mediaState.audioTracks)} />
              <InfoBox label="Video tracks" value={String(mediaState.videoTracks)} />
              <InfoBox label="Microfon" value={mediaState.microphoneEnabled ? "ON" : "OFF"} />
              <InfoBox label="Cameră" value={mediaState.cameraEnabled ? "ON" : "OFF"} />
            </View>

            {mediaState.error ? <Text style={styles.errorText}>{mediaState.error}</Text> : null}
          </View>

          <View style={styles.controlsCard}>
            <Text style={styles.sectionTitle}>Comenzi</Text>

            <View style={styles.buttonRow}>
              <ActionButton icon="mic-outline" label="Start audio" onPress={handleStartAudio} />
              <ActionButton icon="videocam-outline" label="Start video" onPress={handleStartVideo} />
            </View>

            <View style={styles.buttonRow}>
              <ActionButton
                icon={mediaState.microphoneEnabled ? "mic-off-outline" : "mic-outline"}
                label={mediaState.microphoneEnabled ? "Oprește mic" : "Pornește mic"}
                onPress={handleToggleMicrophone}
              />
              <ActionButton
                icon={mediaState.cameraEnabled ? "videocam-off-outline" : "videocam-outline"}
                label={mediaState.cameraEnabled ? "Oprește camera" : "Pornește camera"}
                onPress={handleToggleCamera}
              />
            </View>

            <View style={styles.buttonRow}>
              <ActionButton icon="camera-reverse-outline" label="Schimbă camera" onPress={handleSwitchCamera} />
              <ActionButton icon="stop-circle-outline" label="Stop media" onPress={handleStop} danger />
            </View>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Ce testăm aici</Text>
            <Text style={styles.noteText}>
              Acest ecran nu folosește Supabase, notificări sau apel real. Testează doar dacă APK-ul poate porni
              microfonul și camera locală prin react-native-webrtc.
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function ActionButton({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void | Promise<void>
  danger?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, danger && styles.actionButtonDanger, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color="white" />
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#06152B",
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0B2342",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    padding: 18,
    gap: 16,
    paddingBottom: 34,
  },
  previewCard: {
    height: 360,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#02030A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  emptyPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyPreviewText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    fontWeight: "700",
  },
  statusCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },
  statusTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
  },
  statusText: {
    color: "rgba(255,255,255,0.78)",
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoBox: {
    width: "47%",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  infoLabel: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "700",
  },
  infoValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  errorText: {
    color: "#FCA5A5",
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
  },
  controlsCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    gap: 12,
  },
  sectionTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 2,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#2563EB",
  },
  actionButtonDanger: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  noteCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(123,92,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.22)",
  },
  noteTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },
  noteText: {
    color: "rgba(255,255,255,0.74)",
    marginTop: 8,
    lineHeight: 20,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
})
