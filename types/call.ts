export type CallType = "audio" | "video"

export type CallUiState = "idle" | "outgoing" | "incoming" | "connected"

export type IncomingCall = {
  callSessionId: string
  fromUserId: string
  callType: CallType
  conversationId: string
}
