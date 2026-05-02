export type WebRtcRuntimeState = {
  adapterInstalled: boolean
  devBuildRequired: boolean
  readyForNativeStreams: boolean
  note: string
}

export function getWebRtcRuntimeState(): WebRtcRuntimeState {
  try {
    const moduleRef = require("react-native-webrtc")
    const ready = Boolean(moduleRef?.RTCPeerConnection && moduleRef?.mediaDevices)

    if (ready) {
      return {
        adapterInstalled: true,
        devBuildRequired: true,
        readyForNativeStreams: true,
        note: "Adapterul nativ WebRTC este disponibil în acest build.",
      }
    }
  } catch {
    // fallback below
  }

  return {
    adapterInstalled: false,
    devBuildRequired: true,
    readyForNativeStreams: false,
    note: "Adapterul real WebRTC nu este încă disponibil în build-ul curent. Creează un development build nou după instalarea dependențelor native.",
  }
}

export function assertNativeWebRtcReady() {
  const state = getWebRtcRuntimeState()
  if (!state.readyForNativeStreams) {
    throw new Error(state.note)
  }
}
