import { IceCandidateLike, SessionDescriptionLike, WebRtcConnectionStateLike } from "@/types/webrtc"
import { CallType } from "@/types/call"
import { IceServerConfig, loadTurnCredentials } from "@/lib/calls/turn"
import {
  addNativeIceCandidate,
  applyNativeRemoteDescription,
  closeNativeWebRtcSession,
  createNativeAnswer,
  createNativeOffer,
  createNativeWebRtcSession,
  getNativeWebRtcSession,
  markNativeRemoteStreamReady,
  prepareNativeLocalStream,
  setNativeIceCandidateHandler,
} from "@/lib/calls/webrtcNativeAdapter"

export type WebRtcManagerState = {
  callType: CallType
  localDescription: SessionDescriptionLike | null
  remoteDescription: SessionDescriptionLike | null
  remoteCandidates: IceCandidateLike[]
  localCandidates: IceCandidateLike[]
  connected: boolean
  iceServers: IceServerConfig[]
  diagnostics: string[]
  localStreamReady: boolean
  remoteStreamReady: boolean
  localStreamURL: string | null
  remoteStreamURL: string | null
  connectionState: WebRtcConnectionStateLike
}

let currentState: WebRtcManagerState | null = null
let externalLocalIceHandler: ((candidate: IceCandidateLike) => Promise<void> | void) | null = null

function pushDiagnostic(message: string) {
  if (!currentState) return
  currentState.diagnostics = [...currentState.diagnostics.slice(-10), message]
}

function syncNativeFlags() {
  if (!currentState) return
  const nativeSession = getNativeWebRtcSession()
  currentState.localStreamReady = Boolean(nativeSession?.localReady)
  currentState.remoteStreamReady = Boolean(nativeSession?.remoteReady)
  currentState.localStreamURL = nativeSession?.localURL ?? null
  currentState.remoteStreamURL = nativeSession?.remoteURL ?? null
  currentState.connectionState = nativeSession?.connectionState ?? "unknown"

  const nativeDiagnostics = nativeSession?.diagnostics ?? []
  const combined = [...currentState.diagnostics, ...nativeDiagnostics]
  currentState.diagnostics = combined.slice(-10)
}

function bindNativeIceHandler() {
  setNativeIceCandidateHandler(async (candidate) => {
    if (currentState) {
      currentState.localCandidates.push(candidate)
      pushDiagnostic("ICE local pregătit")
    }

    if (externalLocalIceHandler) {
      await externalLocalIceHandler(candidate)
    }
  })
}

export function setLocalIceCandidateHandler(
  handler: ((candidate: IceCandidateLike) => Promise<void> | void) | null
) {
  externalLocalIceHandler = handler
  bindNativeIceHandler()
}

export async function createWebRtcManager(callType: CallType) {
  const { iceServers } = await loadTurnCredentials().catch(() => ({ iceServers: [] as IceServerConfig[] }))
  await createNativeWebRtcSession(callType, iceServers)

  currentState = {
    callType,
    localDescription: null,
    remoteDescription: null,
    remoteCandidates: [],
    localCandidates: [],
    connected: false,
    iceServers,
    diagnostics: [],
    localStreamReady: false,
    remoteStreamReady: false,
    localStreamURL: null,
    remoteStreamURL: null,
    connectionState: "new",
  }

  bindNativeIceHandler()
  pushDiagnostic(`Manager creat pentru ${callType}`)
  pushDiagnostic(`ICE servers: ${iceServers.length}`)
  syncNativeFlags()

  return currentState
}

export function getWebRtcManagerState() {
  syncNativeFlags()
  return currentState
}

export async function prepareWebRtcLocalStream() {
  await prepareNativeLocalStream()
  syncNativeFlags()
  pushDiagnostic("Local stream pregătit")
}

export async function createLocalOffer(): Promise<SessionDescriptionLike> {
  const offer = await createNativeOffer()

  if (currentState) {
    currentState.localDescription = offer
    pushDiagnostic("Offer local generat")
  }

  return offer
}

export async function createLocalAnswer(): Promise<SessionDescriptionLike> {
  const answer = await createNativeAnswer()

  if (currentState) {
    currentState.localDescription = answer
    pushDiagnostic("Answer local generat")
  }

  return answer
}

export async function applyRemoteDescription(description: SessionDescriptionLike) {
  await applyNativeRemoteDescription(description)

  if (currentState) {
    currentState.remoteDescription = description
    pushDiagnostic(`Remote description aplicată: ${description.type}`)
    if (description.type === "answer") {
      currentState.connected = true
      await markNativeRemoteStreamReady()
      syncNativeFlags()
      pushDiagnostic("Conexiune marcată ca activă")
    }
  }
}

export async function addRemoteIceCandidate(candidate: IceCandidateLike) {
  await addNativeIceCandidate(candidate)

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
    await markNativeRemoteStreamReady()
    syncNativeFlags()
    pushDiagnostic("WebRTC conectat logic")
  }
}

export async function closeWebRtcManager() {
  setNativeIceCandidateHandler(null)
  externalLocalIceHandler = null
  await closeNativeWebRtcSession()
  currentState = null
}
