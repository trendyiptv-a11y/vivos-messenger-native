import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import {
  clearGlobalIncomingVivosCall,
  GlobalIncomingVivosCall,
  subscribeGlobalIncomingVivosCall,
} from "@/lib/calls-v2/globalIncomingCallState"
import { setPendingVivosCallFromNotification } from "@/lib/calls-v2/callNotificationState"
import { rejectVivosCallFromNotification } from "@/lib/calls-v2/notificationReject"
import { stopVivosCallV2Ringtone } from "@/lib/calls-v2/callRingtone"
import { theme } from "@/lib/theme"

export function GlobalIncomingCallBanner() {
  const router = useRouter()
  const [call, setCall] = useState<GlobalIncomingVivosCall | null>(null)
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => subscribeGlobalIncomingVivosCall(setCall), [])

  if (!call) return null

  async function openCall() {
    if (!call) return

    await stopVivosCallV2Ringtone()

    setPendingVivosCallFromNotification(
      {
        conversationId: call.conversationId,
        callSessionId: call.callSessionId,
        fromUserId: call.fromUserId,
        callType: call.callType,
      },
      "open"
    )

    clearGlobalIncomingVivosCall(call.callSessionId)
    router.push({ pathname: "/chat/[id]", params: { id: call.conversationId } })
  }

  async function rejectCall() {
    if (!call || rejecting) return

    setRejecting(true)
    await stopVivosCallV2Ringtone()

    try {
      await rejectVivosCallFromNotification({
        conversationId: call.conversationId,
        callSessionId: call.callSessionId,
        callerUserId: call.fromUserId,
        callType: call.callType,
      })
    } catch (error) {
      console.warn("Global incoming call reject failed", error)
    } finally {
      clearGlobalIncomingVivosCall(call.callSessionId)
      setRejecting(false)
    }
  }

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.banner}>
        <View style={styles.iconCircle}>
          <Ionicons name={call.callType === "video" ? "videocam-outline" : "call-outline"} size={24} color="white" />
        </View>

        <Pressable onPress={openCall} style={({ pressed }) => [styles.textArea, pressed && styles.pressed]}>
          <Text style={styles.kicker}>{call.callType === "video" ? "Apel video VIVOS" : "Apel audio VIVOS"}</Text>
          <Text numberOfLines={1} style={styles.title}>{call.callerName || "Un membru VIVOS"} te sună</Text>
          <Text style={styles.subtitle}>Atinge pentru a deschide conversația</Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            disabled={rejecting}
            onPress={rejectCall}
            style={({ pressed }) => [styles.actionButton, styles.rejectButton, pressed && styles.pressed, rejecting && styles.disabled]}
          >
            <Ionicons name="close-outline" size={22} color="white" />
          </Pressable>

          <Pressable onPress={openCall} style={({ pressed }) => [styles.actionButton, styles.openButton, pressed && styles.pressed]}>
            <Ionicons name="arrow-forward-outline" size={21} color="white" />
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 52,
    left: 12,
    right: 12,
    zIndex: 3000,
    elevation: 3000,
  },
  banner: {
    minHeight: 82,
    borderRadius: 24,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "rgba(8,12,24,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  textArea: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  kicker: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    backgroundColor: "#DC2626",
  },
  openButton: {
    backgroundColor: "#16A34A",
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
})
