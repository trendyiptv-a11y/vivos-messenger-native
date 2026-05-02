import { IceCandidateLike, SessionDescriptionLike } from "@/types/webrtc"
import { CallType } from "@/types/call"
import { IceServerConfig, loadTurnCredentials } from "@/lib/calls/turn"

export type WebRtcManagerState = {
  callType: CallType
  localDescription: SessionDescriptionLike | null
  remoteDescription: SessionDescriptionLike | null
  remoteCandidates: IceCandidateLike[]
  localCandidates: IceCandidateLike[]
  connected: boolean
  iceServers: IceServerConfig[]
  diagnostics: string[]
}

let currentState: WebRtcManagerState | null = null

function pushDiagnostic(message: string) {
  if (!currentState) return
  currentState.diagnostics = [...currentState.diagnostics.slice(-5), message]
}

export async function createWebRtcManager(callType: CallType) {
  const { iceServers } = await loadTurnCredentials().catch(() => ({ iceServers: [] as IceServerConfig[] }))

  currentState = {
    callType,
    localDescription: null,
    remoteDescription: null,
    remoteCandidates: [],
    localCandidates: [],
    connected: false,
    iceServers,
    diagnostics: [],
  }

  pushDiagnostic(`Manager creat pentru ${callType}`)
  pushDiagnostic(`ICE servers: ${iceServers.length}`)

  return currentState
}

export function getWebRtcManagerState() {
  return currentState
}

export async function createLocalOffer(): Promise<SessionDescriptionLike> {
  const offer: SessionDescriptionLike = {
    type: "offer",
    sdp: "TODO_NATIVE_WEBRTC_OFFER",
  }

  if (currentState) {
    currentState.localDescription = offer
    pushDiagnostic("Offer local generat")
  }

  return offer
}

export async function createLocalAnswer(): Promise<SessionDescriptionLike> {
  const answer: SessionDescriptionLike = {
    type: "answer",
    sdp: "TODO_NATIVE_WEBRTC_ANSWER",
  }

  if (currentState) {
    currentState.localDescription = answer
    pushDiagnostic("Answer local generat")
  }

  return answer
}

export async function applyRemoteDescription(description: SessionDescriptionLike) {
  if (currentState) {
    currentState.remoteDescription = description
    pushDiagnostic(`Remote description aplicată: ${description.type}`)
    if (description.type === "answer") {
      currentState.connected = true
      pushDiagnostic("Conexiune marcată ca activă")
    }
  }
}

export async function addRemoteIceCandidate(candidate: IceCandidateLike) {
  if (currentState) {
    currentState.remoteCandidates.push(candidate)
    pushDiagnostic("ICE remote adăugat")
  }
}

export async function addLocalIceCandidate(candidate: IceCandidateLike) {
  if (currentState) {
    currentState.localCandidates.push(candidate)
    pushDiagnostic("ICE local pregătit")
  }
}

export async function markWebRtcConnected() {
  if (currentState) {
    currentState.connected = true
    pushDiagnostic("WebRTC conectat logic")
  }
}

export async function closeWebRtcManager() {
  currentState = null
}
