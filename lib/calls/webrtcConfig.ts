export const WEBRTC_SIGNAL_EVENTS = {
  invite: "call_invite",
  accept: "call_accept",
  reject: "call_reject",
  end: "call_end",
  offer: "webrtc_offer",
  answer: "webrtc_answer",
  ice: "ice_candidate",
} as const

export const WEBRTC_TIMEOUTS = {
  outgoingRingMs: 30000,
  reconnectGraceMs: 12000,
  iceBatchWindowMs: 1200,
} as const

export const WEBRTC_PLACEHOLDERS = {
  offer: "TODO_NATIVE_WEBRTC_ADAPTER_OFFER",
  answer: "TODO_NATIVE_WEBRTC_ADAPTER_ANSWER",
  candidate: "TODO_NATIVE_ICE_CANDIDATE",
} as const
