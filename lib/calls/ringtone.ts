import { Vibration } from "react-native"
import { showLocalIncomingCallNotification } from "@/lib/notifications"

let incomingFeedbackActive = false
let outgoingFeedbackActive = false
let incomingReminderTimer: ReturnType<typeof setInterval> | null = null
let outgoingReminderTimer: ReturnType<typeof setInterval> | null = null

const INCOMING_VIBRATION_PATTERN = [0, 900, 400, 900, 400, 900]
const OUTGOING_RINGBACK_PATTERN = [0, 260, 1750]

export async function startIncomingCallFeedback(callerName = "VIVOS", callType: "audio" | "video" = "audio") {
  if (incomingFeedbackActive) return
  incomingFeedbackActive = true
  outgoingFeedbackActive = false

  if (outgoingReminderTimer) {
    clearInterval(outgoingReminderTimer)
    outgoingReminderTimer = null
  }

  try {
    Vibration.vibrate(INCOMING_VIBRATION_PATTERN, true)
    await showLocalIncomingCallNotification(callerName, callType)

    incomingReminderTimer = setInterval(() => {
      if (!incomingFeedbackActive) return
      Vibration.vibrate(INCOMING_VIBRATION_PATTERN, false)
    }, 7000)
  } catch (error) {
    console.warn("Incoming call feedback failed", error)
  }
}

export async function startOutgoingCallFeedback() {
  if (outgoingFeedbackActive) return
  outgoingFeedbackActive = true
  incomingFeedbackActive = false

  if (incomingReminderTimer) {
    clearInterval(incomingReminderTimer)
    incomingReminderTimer = null
  }

  try {
    Vibration.cancel()
    Vibration.vibrate(OUTGOING_RINGBACK_PATTERN, false)
    outgoingReminderTimer = setInterval(() => {
      if (!outgoingFeedbackActive) return
      Vibration.vibrate(OUTGOING_RINGBACK_PATTERN, false)
    }, 2600)
  } catch (error) {
    console.warn("Outgoing call feedback failed", error)
  }
}

export async function stopIncomingCallFeedback() {
  incomingFeedbackActive = false
  Vibration.cancel()

  if (incomingReminderTimer) {
    clearInterval(incomingReminderTimer)
    incomingReminderTimer = null
  }
}

export async function stopOutgoingCallFeedback() {
  outgoingFeedbackActive = false
  Vibration.cancel()

  if (outgoingReminderTimer) {
    clearInterval(outgoingReminderTimer)
    outgoingReminderTimer = null
  }
}

export async function stopCallFeedback() {
  incomingFeedbackActive = false
  outgoingFeedbackActive = false
  Vibration.cancel()

  if (incomingReminderTimer) {
    clearInterval(incomingReminderTimer)
    incomingReminderTimer = null
  }

  if (outgoingReminderTimer) {
    clearInterval(outgoingReminderTimer)
    outgoingReminderTimer = null
  }
}
