import { DeviceEventEmitter, EmitterSubscription, Platform } from "react-native"
import { VivosCallType } from "@/lib/calls-v2/types"

type AudioRouteSnapshot = {
  callActive: boolean
  speakerEnabled: boolean
  wiredHeadsetAvailable: boolean
  bluetoothAvailable: boolean
  selectedDevice: string | null
  diagnostics: string[]
}

type AudioRouteSubscriber = (snapshot: AudioRouteSnapshot) => void

let inCallManagerRef: any | null = null
let listenersStarted = false
let nativeSubscriptions: EmitterSubscription[] = []
const subscribers = new Set<AudioRouteSubscriber>()

let routeState: AudioRouteSnapshot = {
  callActive: false,
  speakerEnabled: false,
  wiredHeadsetAvailable: false,
  bluetoothAvailable: false,
  selectedDevice: null,
  diagnostics: [],
}

function getInCallManager() {
  if (inCallManagerRef) return inCallManagerRef

  try {
    const mod = require("react-native-incall-manager")
    inCallManagerRef = mod?.default ?? mod
    return inCallManagerRef
  } catch (error) {
    pushDiagnostic("InCallManager indisponibil")
    return null
  }
}

function pushDiagnostic(message: string) {
  routeState = {
    ...routeState,
    diagnostics: [...routeState.diagnostics.slice(-12), message],
  }

  notifySubscribers()
}

function notifySubscribers() {
  const snapshot = getVivosAudioRouteSnapshot()
  subscribers.forEach((subscriber) => {
    try {
      subscriber(snapshot)
    } catch {
      // ignore subscriber errors
    }
  })
}

function normalizeBool(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1"
}

function updateFromAudioDeviceEvent(data: any) {
  const selected =
    data?.selectedAudioDevice ||
    data?.selectedDevice ||
    data?.device ||
    data?.route ||
    null

  const list =
    data?.availableAudioDeviceList ||
    data?.availableDevices ||
    data?.devices ||
    []

  const serialized = `${selected ?? ""} ${Array.isArray(list) ? list.join(" ") : String(list ?? "")}`.toLowerCase()

  const bluetoothAvailable =
    serialized.includes("bluetooth") ||
    serialized.includes("bt") ||
    serialized.includes("headset")

  const wiredHeadsetAvailable =
    serialized.includes("wired") ||
    serialized.includes("headphone") ||
    serialized.includes("earphone")

  routeState = {
    ...routeState,
    selectedDevice: selected ? String(selected) : routeState.selectedDevice,
    bluetoothAvailable: bluetoothAvailable || routeState.bluetoothAvailable,
    wiredHeadsetAvailable: wiredHeadsetAvailable || routeState.wiredHeadsetAvailable,
  }

  pushDiagnostic(`Audio route event: ${selected ?? "unknown"}`)
}

export function ensureVivosAudioRouteListeners() {
  if (listenersStarted) return
  listenersStarted = true

  nativeSubscriptions = [
    DeviceEventEmitter.addListener("WiredHeadset", (data: any) => {
      const plugged =
        normalizeBool(data?.isPlugged) ||
        normalizeBool(data?.plugged) ||
        normalizeBool(data?.isHeadsetPlugged)

      routeState = {
        ...routeState,
        wiredHeadsetAvailable: plugged,
      }

      pushDiagnostic(plugged ? "Cască fir detectată" : "Cască fir scoasă")

      if (plugged) {
        setVivosSpeakerEnabled(false, "wired-headset")
      }
    }),

    DeviceEventEmitter.addListener("NoisyAudio", () => {
      routeState = {
        ...routeState,
        wiredHeadsetAvailable: false,
        bluetoothAvailable: false,
      }

      pushDiagnostic("Audio device deconectat")
    }),

    DeviceEventEmitter.addListener("onAudioDeviceChanged", updateFromAudioDeviceEvent),
    DeviceEventEmitter.addListener("AudioDeviceChanged", updateFromAudioDeviceEvent),
  ]

  pushDiagnostic("Audio route listeners active")
}

export function subscribeVivosAudioRoute(subscriber: AudioRouteSubscriber) {
  subscribers.add(subscriber)
  subscriber(getVivosAudioRouteSnapshot())

  return () => {
    subscribers.delete(subscriber)
  }
}

export function getVivosAudioRouteSnapshot(): AudioRouteSnapshot {
  return {
    ...routeState,
    diagnostics: [...routeState.diagnostics],
  }
}

export async function startVivosAudioRoute(callType: VivosCallType) {
  ensureVivosAudioRouteListeners()

  const manager = getInCallManager()
  const defaultSpeaker = callType === "video"

  routeState = {
    ...routeState,
    callActive: true,
    speakerEnabled: defaultSpeaker,
  }

  if (!manager || Platform.OS === "web") {
    pushDiagnostic("Audio route nativ indisponibil")
    return getVivosAudioRouteSnapshot()
  }

  try {
    if (typeof manager.start === "function") {
      manager.start({ media: "audio" })
    }

    if (typeof manager.setKeepScreenOn === "function") {
      manager.setKeepScreenOn(true)
    }

    await setVivosSpeakerEnabled(defaultSpeaker, `start-${callType}`)
    pushDiagnostic(defaultSpeaker ? "Speaker pornit implicit pentru video" : "Audio route pornit")
  } catch (error) {
    console.warn("startVivosAudioRoute failed", error)
    pushDiagnostic("Start audio route a eșuat")
  }

  return getVivosAudioRouteSnapshot()
}

export async function setVivosSpeakerEnabled(enabled: boolean, reason = "manual") {
  const manager = getInCallManager()

  routeState = {
    ...routeState,
    speakerEnabled: enabled,
  }

  if (!manager || Platform.OS === "web") {
    pushDiagnostic(`Speaker ${enabled ? "ON" : "OFF"} local: ${reason}`)
    return getVivosAudioRouteSnapshot()
  }

  try {
    if (typeof manager.setForceSpeakerphoneOn === "function") {
      manager.setForceSpeakerphoneOn(enabled)
    }

    if (typeof manager.setSpeakerphoneOn === "function") {
      manager.setSpeakerphoneOn(enabled)
    }

    pushDiagnostic(`Speaker ${enabled ? "ON" : "OFF"}: ${reason}`)
  } catch (error) {
    console.warn("setVivosSpeakerEnabled failed", error)
    pushDiagnostic("Schimbarea speakerului a eșuat")
  }

  notifySubscribers()
  return getVivosAudioRouteSnapshot()
}

export async function toggleVivosSpeaker() {
  const next = !routeState.speakerEnabled
  return setVivosSpeakerEnabled(next, "toggle")
}

export async function stopVivosAudioRoute() {
  const manager = getInCallManager()

  try {
    if (manager && Platform.OS !== "web") {
      if (typeof manager.setSpeakerphoneOn === "function") {
        manager.setSpeakerphoneOn(false)
      }

      if (typeof manager.setForceSpeakerphoneOn === "function") {
        manager.setForceSpeakerphoneOn(false)
      }

      if (typeof manager.setKeepScreenOn === "function") {
        manager.setKeepScreenOn(false)
      }

      if (typeof manager.stop === "function") {
        manager.stop()
      }
    }
  } catch (error) {
    console.warn("stopVivosAudioRoute failed", error)
  }

  routeState = {
    callActive: false,
    speakerEnabled: false,
    wiredHeadsetAvailable: routeState.wiredHeadsetAvailable,
    bluetoothAvailable: routeState.bluetoothAvailable,
    selectedDevice: routeState.selectedDevice,
    diagnostics: [...routeState.diagnostics.slice(-10), "Audio route oprit"],
  }

  notifySubscribers()
}

export function cleanupVivosAudioRouteListeners() {
  nativeSubscriptions.forEach((subscription) => {
    try {
      subscription.remove()
    } catch {
      // ignore
    }
  })

  nativeSubscriptions = []
  listenersStarted = false
}
