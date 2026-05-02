import { IceCandidateLike, NativeStreamViewState, SessionDescriptionLike, WebRtcConnectionStateLike } from "@/types/webrtc"
import { CallType } from "@/types/call"
import { getWebRtcRuntimeState } from "@/lib/calls/webrtcRuntime"
import { WEBRTC_PLACEHOLDERS } from "@/lib/calls/webrtcConfig"

type ReactNativeWebRtcModule = typeof import("react-native-webrtc")
type PeerConnectionLike = InstanceType<ReactNativeWebRtcModule["RTCPeerConnection"]>
type StreamLike = import("react-native-webrtc").MediaStream

type NativeWebRtcInternals = {
  moduleRef: ReactNativeWebRtcModule | null
  peerConnection: PeerConnectionLike | null
  localStream: StreamLike | null
  remoteStream: StreamLike | null
}

export type NativeWebRtcSession = NativeStreamViewState & {
  callType: CallType
  diagnostics: string[]
}

let currentNativeSession: NativeWebRtcSession | null = null
let internals: NativeWebRtcInternals = {
  moduleRef: null,
  peerConnection: null,
  localStream: null,
  remoteStream: null,
}

function pushDiagnostic(message: string) {
  if (!currentNativeSession) return
  currentNativeSession.diagnostics = [...currentNativeSession.diagnostics.slice(-10), message]
}

function setConnectionState(state: WebRtcConnectionStateLike) {
  if (!currentNativeSession) return
  currentNativeSession.connectionState = state
}

function getModuleRef(): ReactNativeWebRtcModule | null {
  if (internals.moduleRef) return internals.moduleRef
  try {
    internals.moduleRef = require("react-native-webrtc") as ReactNativeWebRtcModule
    return internals.moduleRef
  } catch {
    return null
  }
}

function syncStreamURLs() {
  if (!currentNativeSession) return
  currentNativeSession.localURL = internals.localStream?.toURL?.() ?? null
  currentNativeSession.remoteURL = internals.remoteStream?.toURL?.() ?? null
  currentNativeSession.localReady = Boolean(currentNativeSession.localURL)
  currentNativeSession.remoteReady = Boolean(currentNativeSession.remoteURL)
}

async function ensurePeerConnection() {
  const moduleRef = getModuleRef()
  if (!moduleRef) return null
  if (internals.peerConnection) return internals.peerConnection

  const pc = new moduleRef.RTCPeerConnection({ iceServers: [] })

  pc.onconnectionstatechange = () => {
    const nextState = (pc.connectionState || "unknown") as WebRtcConnectionStateLike
    setConnectionState(nextState)
    pushDiagnostic(`Connection state: ${nextState}`)
  }

  pc.ontrack = (event: { streams?: StreamLike[] }) => {
    const remote = event.streams?.[0] ?? null
    internals.remoteStream = remote
    syncStreamURLs()
    pushDiagnostic(remote ? "Remote stream atașat" : "Track remote fără stream")
  }

  internals.peerConnection = pc
  return pc
}

export async function createNativeWebRtcSession(callType: CallType) {
  const runtime = getWebRtcRuntimeState()

  currentNativeSession = {
    callType,
    localURL: null,
    remoteURL: null,
    localReady: false,
    remoteReady: false,
    connectionState: "new",
    diagnostics: [],
  }

  internals = {
    moduleRef: getModuleRef(),
    peerConnection: null,
    localStream: null,
    remoteStream: null,
  }

  pushDiagnostic(`Sesiune nativă creată pentru ${callType}`)
  pushDiagnostic(runtime.note)

  if (runtime.readyForNativeStreams) {
    await ensurePeerConnection()
  }

  return currentNativeSession
}

export function getNativeWebRtcSession() {
  syncStreamURLs()
  return currentNativeSession
}

export async function prepareNativeLocalStream() {
  const moduleRef = getModuleRef()
  const pc = await ensurePeerConnection()

  if (!currentNativeSession) return
  if (!moduleRef || !pc) {
    currentNativeSession.localReady = true
    pushDiagnostic("Local stream fallback marcat ca pregătit")
    return
  }

  const localStream = await moduleRef.mediaDevices.getUserMedia({
    audio: true,
    video: currentNativeSession.callType === "video",
  })

  internals.localStream = localStream
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
  syncStreamURLs()
  pushDiagnostic("Local stream nativ pregătit")
}

export async function markNativeRemoteStreamReady() {
  if (currentNativeSession) {
    currentNativeSession.remoteReady = Boolean(currentNativeSession.remoteURL || internals.remoteStream)
    syncStreamURLs()
    pushDiagnostic("Remote stream marcat ca pregătit")
  }
}

export async function createNativeOffer(): Promise<SessionDescriptionLike> {
  const pc = await ensurePeerConnection()
  if (!pc) {
    pushDiagnostic("Offer placeholder generat")
    return {
      type: "offer",
      sdp: WEBRTC_PLACEHOLDERS.offer,
    }
  }

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  pushDiagnostic("Offer nativ generat")
  return {
    type: "offer",
    sdp: offer.sdp || WEBRTC_PLACEHOLDERS.offer,
  }
}

export async function createNativeAnswer(): Promise<SessionDescriptionLike> {
  const pc = await ensurePeerConnection()
  if (!pc) {
    pushDiagnostic("Answer placeholder generat")
    return {
      type: "answer",
      sdp: WEBRTC_PLACEHOLDERS.answer,
    }
  }

  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  pushDiagnostic("Answer nativ generat")
  return {
    type: "answer",
    sdp: answer.sdp || WEBRTC_PLACEHOLDERS.answer,
  }
}

export async function applyNativeRemoteDescription(description: SessionDescriptionLike) {
  const moduleRef = getModuleRef()
  const pc = await ensurePeerConnection()

  if (!moduleRef || !pc) {
    pushDiagnostic("Remote description primită în fallback adapter")
    return
  }

  await pc.setRemoteDescription(new moduleRef.RTCSessionDescription(description))
  pushDiagnostic(`Remote description aplicată: ${description.type}`)
}

export async function addNativeIceCandidate(candidate: IceCandidateLike) {
  const moduleRef = getModuleRef()
  const pc = await ensurePeerConnection()

  if (!moduleRef || !pc) {
    pushDiagnostic("ICE candidate primit în fallback adapter")
    return
  }

  await pc.addIceCandidate(new moduleRef.RTCIceCandidate(candidate))
  pushDiagnostic("ICE candidate aplicat")
}

export async function closeNativeWebRtcSession() {
  try {
    internals.localStream?.getTracks().forEach((track) => track.stop())
    internals.remoteStream?.getTracks().forEach((track) => track.stop())
    internals.peerConnection?.close()
  } catch {
    // ignore cleanup failures
  }

  currentNativeSession = null
  internals = {
    moduleRef: null,
    peerConnection: null,
    localStream: null,
    remoteStream: null,
  }
}
