export type SessionDescriptionLike = {
  type: "offer" | "answer"
  sdp: string
}

export type IceCandidateLike = {
  candidate: string
  sdpMid?: string | null
  sdpMLineIndex?: number | null
  usernameFragment?: string | null
}

export type WebRtcSignalPayload = {
  callSessionId: string
  conversationId: string
  fromUserId: string
  callType: "audio" | "video"
}

export type WebRtcConnectionStateLike =
  | "new"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "closed"
  | "unknown"

export type NativeStreamViewState = {
  localURL: string | null
  remoteURL: string | null
  localReady: boolean
  remoteReady: boolean
  connectionState: WebRtcConnectionStateLike
}
