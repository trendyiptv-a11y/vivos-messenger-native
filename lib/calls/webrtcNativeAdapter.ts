import { IceCandidateLike, SessionDescriptionLike } from "@/types/webrtc"
import { CallType } from "@/types/call"
import { getWebRtcRuntimeState } from "@/lib/calls/webrtcRuntime"
import { WEBRTC_PLACEHOLDERS } from "@/lib/calls/webrtcConfig"

export type NativeWebRtcSession = {
  callType: CallType
  localStreamReady: boolean
  remoteStreamReady: boolean
  diagnostics: string[]
}

let currentNativeSession: NativeWebRtcSession | null = null

function pushDiagnostic(message: string) {
  if (!currentNativeSession) return
  currentNativeSession.diagnostics = [...currentNativeSession.diagnostics.slice(-6), message]
}

export async function createNativeWebRtcSession(callType: CallType) {
  const runtime = getWebRtcRuntimeState()

  currentNativeSession = {
    callType,
    localStreamReady: false,
    remoteStreamReady: false,
    diagnostics: [],
  }

  pushDiagnostic(`Sesiune nativă creată pentru ${callType}`)
  pushDiagnostic(runtime.note)

  return currentNativeSession
}

export function getNativeWebRtcSession() {
  return currentNativeSession
}

export async function prepareNativeLocalStream() {
  if (currentNativeSession) {
    currentNativeSession.localStreamReady = true
    pushDiagnostic("Local stream marcat ca pregătit")
  }
}

export async function markNativeRemoteStreamReady() {
  if (currentNativeSession) {
    currentNativeSession.remoteStreamReady = true
    pushDiagnostic("Remote stream marcat ca pregătit")
  }
}

export async function createNativeOffer(): Promise<SessionDescriptionLike> {
  pushDiagnostic("Offer placeholder generat")
  return {
    type: "offer",
    sdp: WEBRTC_PLACEHOLDERS.offer,
  }
}

export async function createNativeAnswer(): Promise<SessionDescriptionLike> {
  pushDiagnostic("Answer placeholder generat")
  return {
    type: "answer",
    sdp: WEBRTC_PLACEHOLDERS.answer,
  }
}

export async function applyNativeRemoteDescription(_description: SessionDescriptionLike) {
  pushDiagnostic("Remote description primită în adapter")
  return
}

export async function addNativeIceCandidate(_candidate: IceCandidateLike) {
  pushDiagnostic("ICE candidate primit în adapter")
  return
}

export async function closeNativeWebRtcSession() {
  currentNativeSession = null
}
