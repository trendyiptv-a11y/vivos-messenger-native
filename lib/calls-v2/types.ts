export type VivosCallType = "audio" | "video"

export type VivosCallStatus =
  | "idle"
  | "ringing_outgoing"
  | "ringing_incoming"
  | "connecting"
  | "connected"
  | "ending"
  | "ended"
  | "rejected"
  | "missed"
  | "failed"

export type VivosCallSignalType =
  | "call_invite"
  | "call_accept"
  | "call_reject"
  | "call_end"
  | "webrtc_offer"
  | "webrtc_answer"
  | "ice_candidate"

export type VivosCallSession = {
  id: string
  conversationId: string
  callerId: string
  calleeId: string
  callType: VivosCallType
  status: VivosCallStatus
  createdAt?: string | null
  acceptedAt?: string | null
  endedAt?: string | null
}

export type VivosIncomingCall = {
  callSessionId: string
  conversationId: string
  fromUserId: string
  callType: VivosCallType
  callerName?: string | null
}

export type VivosCallSignalPayload = {
  type: VivosCallSignalType
  callSessionId: string
  conversationId: string
  fromUserId: string
  toUserId?: string | null
  callType: VivosCallType
  sdp?: any
  candidate?: any
  createdAt?: string
}

export type VivosCallRuntimeState = {
  status: VivosCallStatus
  callSessionId: string | null
  conversationId: string | null
  remoteUserId: string | null
  callType: VivosCallType
  localStreamReady: boolean
  remoteStreamReady: boolean
  localStreamURL: string | null
  remoteStreamURL: string | null
  microphoneEnabled: boolean
  cameraEnabled: boolean
  speakerEnabled: boolean
  diagnostics: string[]
}

export const initialVivosCallState: VivosCallRuntimeState = {
  status: "idle",
  callSessionId: null,
  conversationId: null,
  remoteUserId: null,
  callType: "audio",
  localStreamReady: false,
  remoteStreamReady: false,
  localStreamURL: null,
  remoteStreamURL: null,
  microphoneEnabled: true,
  cameraEnabled: false,
  speakerEnabled: false,
  diagnostics: [],
}
