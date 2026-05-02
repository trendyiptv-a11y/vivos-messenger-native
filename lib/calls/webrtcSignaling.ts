import { RealtimeChannel } from "@supabase/supabase-js"
import { CallType } from "@/types/call"
import { IceCandidateLike, SessionDescriptionLike, WebRtcSignalPayload } from "@/types/webrtc"

export async function sendOfferSignal(
  channel: RealtimeChannel | null,
  payload: WebRtcSignalPayload & { sdp: SessionDescriptionLike }
) {
  if (!channel) return
  await channel.send({
    type: "broadcast",
    event: "webrtc_offer",
    payload,
  })
}

export async function sendAnswerSignal(
  channel: RealtimeChannel | null,
  payload: WebRtcSignalPayload & { sdp: SessionDescriptionLike }
) {
  if (!channel) return
  await channel.send({
    type: "broadcast",
    event: "webrtc_answer",
    payload,
  })
}

export async function sendIceCandidateSignal(
  channel: RealtimeChannel | null,
  payload: WebRtcSignalPayload & { candidate: IceCandidateLike }
) {
  if (!channel) return
  await channel.send({
    type: "broadcast",
    event: "ice_candidate",
    payload,
  })
}

export function buildWebRtcSignalPayload(args: {
  callSessionId: string
  conversationId: string
  fromUserId: string
  callType: CallType
}): WebRtcSignalPayload {
  return {
    callSessionId: args.callSessionId,
    conversationId: args.conversationId,
    fromUserId: args.fromUserId,
    callType: args.callType,
  }
}
