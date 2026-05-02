export type WebRtcRuntimeState = {
  adapterInstalled: boolean
  devBuildRequired: boolean
  readyForNativeStreams: boolean
  note: string
}

export function getWebRtcRuntimeState(): WebRtcRuntimeState {
  return {
    adapterInstalled: false,
    devBuildRequired: true,
    readyForNativeStreams: false,
    note: "Adapterul real WebRTC nu este încă instalat. Următorul pas este integrarea bibliotecii native și trecerea pe dev build.",
  }
}

export function assertNativeWebRtcReady() {
  const state = getWebRtcRuntimeState()
  if (!state.readyForNativeStreams) {
    throw new Error(state.note)
  }
}
