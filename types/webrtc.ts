export type SessionDescriptionLike = {
  type: "offer" | "answer"
  sdp: string
}

export type IceCandidateLike = {
  candidate: string
  sdpMid?: string | null
  sdpMLineIndex?: number | null
}

export type WebRtcSignalPayload = {
  callSessionId: string
  conversationId: string
  fromUserId: string
  callType: "audio" | "video"
}
