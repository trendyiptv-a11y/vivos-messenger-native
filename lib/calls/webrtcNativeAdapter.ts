import { IceCandidateLike, SessionDescriptionLike } from "@/types/webrtc"
import { CallType } from "@/types/call"

export type NativeWebRtcSession = {
  callType: CallType
  localStreamReady: boolean
  remoteStreamReady: boolean
}

let currentNativeSession: NativeWebRtcSession | null = null

export async function createNativeWebRtcSession(callType: CallType) {
  currentNativeSession = {
    callType,
    localStreamReady: false,
    remoteStreamReady: false,
  }

  return currentNativeSession
}

export function getNativeWebRtcSession() {
  return currentNativeSession
}

export async function prepareNativeLocalStream() {
  if (currentNativeSession) {
    currentNativeSession.localStreamReady = true
  }
}

export async function markNativeRemoteStreamReady() {
  if (currentNativeSession) {
    currentNativeSession.remoteStreamReady = true
  }
}

export async function createNativeOffer(): Promise<SessionDescriptionLike> {
  return {
    type: "offer",
    sdp: "TODO_NATIVE_WEBRTC_ADAPTER_OFFER",
  }
}

export async function createNativeAnswer(): Promise<SessionDescriptionLike> {
  return {
    type: "answer",
    sdp: "TODO_NATIVE_WEBRTC_ADAPTER_ANSWER",
  }
}

export async function applyNativeRemoteDescription(_description: SessionDescriptionLike) {
  return
}

export async function addNativeIceCandidate(_candidate: IceCandidateLike) {
  return
}

export async function closeNativeWebRtcSession() {
  currentNativeSession = null
}
