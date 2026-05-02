import { IceCandidateLike, SessionDescriptionLike } from "@/types/webrtc"
import { CallType } from "@/types/call"

export type WebRtcManagerState = {
  callType: CallType
  localDescription: SessionDescriptionLike | null
  remoteDescription: SessionDescriptionLike | null
  remoteCandidates: IceCandidateLike[]
  connected: boolean
}

let currentState: WebRtcManagerState | null = null

export async function createWebRtcManager(callType: CallType) {
  currentState = {
    callType,
    localDescription: null,
    remoteDescription: null,
    remoteCandidates: [],
    connected: false,
  }

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
  }

  return answer
}

export async function applyRemoteDescription(description: SessionDescriptionLike) {
  if (currentState) {
    currentState.remoteDescription = description
    if (description.type === "answer") {
      currentState.connected = true
    }
  }
}

export async function addRemoteIceCandidate(candidate: IceCandidateLike) {
  if (currentState) {
    currentState.remoteCandidates.push(candidate)
  }
}

export async function markWebRtcConnected() {
  if (currentState) {
    currentState.connected = true
  }
}

export async function closeWebRtcManager() {
  currentState = null
}
