import { Vibration } from "react-native"
import { showLocalIncomingCallNotification } from "@/lib/notifications"

let feedbackActive = false
let reminderTimer: ReturnType<typeof setInterval> | null = null

const VIBRATION_PATTERN = [0, 900, 400, 900, 400, 900]

export async function startIncomingCallFeedback(callerName = "VIVOS", callType: "audio" | "video" = "audio") {
  if (feedbackActive) return
  feedbackActive = true

  try {
    Vibration.vibrate(VIBRATION_PATTERN, true)
    await showLocalIncomingCallNotification(callerName, callType)

    reminderTimer = setInterval(() => {
      if (!feedbackActive) return
      Vibration.vibrate(VIBRATION_PATTERN, false)
    }, 7000)
  } catch (error) {
    console.warn("Incoming call feedback failed", error)
  }
}

export async function stopIncomingCallFeedback() {
  feedbackActive = false
  Vibration.cancel()

  if (reminderTimer) {
    clearInterval(reminderTimer)
    reminderTimer = null
  }
}
