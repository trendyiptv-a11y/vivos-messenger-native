import { Platform } from "react-native"

type InCallManagerLike = {
  start?: (options?: { media?: "audio" | "video"; auto?: boolean }) => void
  stop?: () => void
  setSpeakerphoneOn?: (enabled: boolean) => void
  setForceSpeakerphoneOn?: (enabled: boolean) => void
  setKeepScreenOn?: (enabled: boolean) => void
}

let inCallManager: InCallManagerLike | null | undefined

function getInCallManager() {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return null
  if (inCallManager !== undefined) return inCallManager

  try {
    const moduleRef = require("react-native-incall-manager")
    inCallManager = moduleRef?.default ?? moduleRef ?? null
  } catch {
    inCallManager = null
  }

  return inCallManager
}

export function startNativeAudioRoute(callType: "audio" | "video") {
  const manager = getInCallManager()
  if (!manager) return false

  try {
    manager.start?.({ media: callType === "video" ? "video" : "audio", auto: true })
    manager.setKeepScreenOn?.(true)
    manager.setForceSpeakerphoneOn?.(callType === "video")
    manager.setSpeakerphoneOn?.(callType === "video")
    return true
  } catch (error) {
    console.warn("Audio route start failed", error)
    return false
  }
}

export function setNativeSpeakerphone(enabled: boolean) {
  const manager = getInCallManager()
  if (!manager) return false

  try {
    manager.setForceSpeakerphoneOn?.(enabled)
    manager.setSpeakerphoneOn?.(enabled)
    return true
  } catch (error) {
    console.warn("Speaker route change failed", error)
    return false
  }
}

export function stopNativeAudioRoute() {
  const manager = getInCallManager()
  if (!manager) return false

  try {
    manager.setForceSpeakerphoneOn?.(false)
    manager.setSpeakerphoneOn?.(false)
    manager.setKeepScreenOn?.(false)
    manager.stop?.()
    return true
  } catch (error) {
    console.warn("Audio route stop failed", error)
    return false
  }
}
