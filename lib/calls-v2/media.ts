import { VivosCallType } from "@/lib/calls-v2/types"

type ReactNativeWebRtcModule = typeof import("react-native-webrtc")
type MediaStreamLike = import("react-native-webrtc").MediaStream

let moduleRef: ReactNativeWebRtcModule | null = null
let localStream: MediaStreamLike | null = null

function getModuleRef(): ReactNativeWebRtcModule | null {
  if (moduleRef) return moduleRef

  try {
    moduleRef = require("react-native-webrtc") as ReactNativeWebRtcModule
    return moduleRef
  } catch (error) {
    console.warn("react-native-webrtc unavailable", error)
    return null
  }
}

export function getLocalStream() {
  return localStream
}

export function getLocalStreamURL() {
  return localStream?.toURL?.() ?? null
}

export function getLocalAudioTracks() {
  return localStream?.getAudioTracks?.() ?? []
}

export function getLocalVideoTracks() {
  return localStream?.getVideoTracks?.() ?? []
}

export async function startLocalMedia(callType: VivosCallType) {
  const webrtc = getModuleRef()

  if (!webrtc) {
    throw new Error("react-native-webrtc nu este disponibil în acest build.")
  }

  await stopLocalMedia()

  localStream = await webrtc.mediaDevices.getUserMedia({
    audio: true,
    video: callType === "video" ? { facingMode: "user" } : false,
  })

  return {
    stream: localStream,
    streamURL: getLocalStreamURL(),
    audioTracks: getLocalAudioTracks().length,
    videoTracks: getLocalVideoTracks().length,
  }
}

export async function stopLocalMedia() {
  try {
    localStream?.getTracks?.().forEach((track) => {
      track.stop()
    })
  } catch (error) {
    console.warn("stopLocalMedia failed", error)
  } finally {
    localStream = null
  }
}

export function setMicrophoneEnabled(enabled: boolean) {
  getLocalAudioTracks().forEach((track: any) => {
    track.enabled = enabled
  })

  return enabled
}

export async function setCameraEnabled(enabled: boolean) {
  const webrtc = getModuleRef()

  if (!localStream) {
    if (!enabled) return false
    const result = await startLocalMedia("video")
    return Boolean(result.videoTracks)
  }

  const existingVideoTracks = getLocalVideoTracks()

  if (enabled && existingVideoTracks.length === 0) {
    if (!webrtc) return false

    const cameraStream = await webrtc.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user" },
    })

    const cameraTrack = cameraStream.getVideoTracks?.()[0]

    if (!cameraTrack) return false

    if (typeof localStream.addTrack === "function") {
      localStream.addTrack(cameraTrack)
    } else {
      localStream = cameraStream
    }
  }

  getLocalVideoTracks().forEach((track: any) => {
    track.enabled = enabled
  })

  return enabled
}

export async function switchCamera() {
  const videoTrack = getLocalVideoTracks()[0] as any

  if (videoTrack && typeof videoTrack._switchCamera === "function") {
    await videoTrack._switchCamera()
    return true
  }

  return false
}

export function getMediaSnapshot() {
  return {
    localStreamURL: getLocalStreamURL(),
    audioTracks: getLocalAudioTracks().length,
    videoTracks: getLocalVideoTracks().length,
    microphoneEnabled: getLocalAudioTracks().some((track: any) => track.enabled !== false),
    cameraEnabled: getLocalVideoTracks().some((track: any) => track.enabled !== false),
  }
}
