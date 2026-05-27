import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { updateOwnPresence } from "@/lib/presence/userPresence"
import { VivosCallSignalPayload, VivosCallSignalType, VivosCallType } from "@/lib/calls-v2/types"
import { VivosIceCandidate, VivosSessionDescription } from "@/lib/calls-v2/peer"

type SignalHandler = (payload: VivosCallSignalPayload) => void | Promise<void>

type CreateCallSignalPayloadArgs = {
  type: VivosCallSignalType
  callSessionId: string
  conversationId: string
  fromUserId: string
  toUserId?: string | null
  callType: VivosCallType
  sdp?: VivosSessionDescription
  candidate?: VivosIceCandidate
}

const SIGNAL_CHANNEL_WAIT_ATTEMPTS = 8
const SIGNAL_CHANNEL_WAIT_MS = 150
const SIGNAL_SEND_RETRY_ATTEMPTS = 3
const SIGNAL_SEND_RETRY_MS = 220

let activeChannel: RealtimeChannel | null = null
const channelStatuses = new WeakMap<RealtimeChannel, string>()

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isChannelSubscribed(channel: RealtimeChannel | null) {
  return Boolean(channel && channelStatuses.get(channel) === "SUBSCRIBED")
}

async function waitForVivosCallChannel(initialChannel: RealtimeChannel | null) {
  let candidate = initialChannel || activeChannel

  if (isChannelSubscribed(candidate)) return candidate

  for (let attempt = 0; attempt < SIGNAL_CHANNEL_WAIT_ATTEMPTS; attempt += 1) {
    await sleep(SIGNAL_CHANNEL_WAIT_MS)
    candidate = initialChannel || activeChannel

    if (isChannelSubscribed(candidate)) return candidate
  }

  if (candidate) {
    console.warn("sendVivosCallSignal using channel before SUBSCRIBED", channelStatuses.get(candidate) || "UNKNOWN")
  }

  return candidate
}

export function buildVivosCallSignalPayload(args: CreateCallSignalPayloadArgs): VivosCallSignalPayload {
  return {
    type: args.type,
    callSessionId: args.callSessionId,
    conversationId: args.conversationId,
    fromUserId: args.fromUserId,
    toUserId: args.toUserId ?? null,
    callType: args.callType,
    sdp: args.sdp,
    candidate: args.candidate,
    createdAt: new Date().toISOString(),
  }
}

export function getVivosCallChannelName(conversationId: string) {
  return `vivos-call-v2:${conversationId}`
}

export function getActiveVivosCallChannel() {
  return activeChannel
}

export async function closeVivosCallChannel() {
  if (!activeChannel) return

  const channel = activeChannel
  activeChannel = null
  channelStatuses.delete(channel)

  await supabase.removeChannel(channel).catch((error) => {
    console.warn("closeVivosCallChannel failed", error)
  })
}

export function createVivosCallChannel(args: {
  conversationId: string
  userId: string
  onSignal: SignalHandler
}) {
  const { conversationId, userId, onSignal } = args

  let active = true

  const channel = supabase
    .channel(getVivosCallChannelName(conversationId))
    .on("broadcast", { event: "call_invite" }, async ({ payload }) => {
      if (!active) return
      const signal = payload as VivosCallSignalPayload
      if (!shouldProcessSignal(signal, userId)) return
      await onSignal(signal)
    })
    .on("broadcast", { event: "call_accept" }, async ({ payload }) => {
      if (!active) return
      const signal = payload as VivosCallSignalPayload
      if (!shouldProcessSignal(signal, userId)) return
      await onSignal(signal)
    })
    .on("broadcast", { event: "call_reject" }, async ({ payload }) => {
      if (!active) return
      const signal = payload as VivosCallSignalPayload
      if (!shouldProcessSignal(signal, userId)) return
      await onSignal(signal)
    })
    .on("broadcast", { event: "call_end" }, async ({ payload }) => {
      if (!active) return
      const signal = payload as VivosCallSignalPayload
      if (!shouldProcessSignal(signal, userId)) return
      await onSignal(signal)
    })
    .on("broadcast", { event: "webrtc_offer" }, async ({ payload }) => {
      if (!active) return
      const signal = payload as VivosCallSignalPayload
      if (!shouldProcessSignal(signal, userId)) return
      await onSignal(signal)
    })
    .on("broadcast", { event: "webrtc_answer" }, async ({ payload }) => {
      if (!active) return
      const signal = payload as VivosCallSignalPayload
      if (!shouldProcessSignal(signal, userId)) return
      await onSignal(signal)
    })
    .on("broadcast", { event: "ice_candidate" }, async ({ payload }) => {
      if (!active) return
      const signal = payload as VivosCallSignalPayload
      if (!shouldProcessSignal(signal, userId)) return
      await onSignal(signal)
    })
    .subscribe((status) => {
      channelStatuses.set(channel, status)
      console.log("VIVOS call v2 channel status:", status)
    })

  activeChannel = channel
  channelStatuses.set(channel, "CREATED")

  return {
    channel,
    close: async () => {
      active = false

      if (activeChannel === channel) {
        activeChannel = null
      }

      channelStatuses.delete(channel)

      await supabase.removeChannel(channel).catch((error) => {
        console.warn("VIVOS call v2 channel cleanup failed", error)
      })
    },
  }
}

function shouldProcessSignal(signal: VivosCallSignalPayload | null | undefined, userId: string) {
  if (!signal) return false
  if (!signal.type) return false
  if (!signal.callSessionId) return false
  if (!signal.conversationId) return false
  if (!signal.fromUserId) return false

  // Nu procesăm propriile semnale.
  if (signal.fromUserId === userId) return false

  // Dacă semnalul are destinatar explicit, îl procesăm doar dacă este pentru userul curent.
  if (signal.toUserId && signal.toUserId !== userId) return false

  return true
}

export async function sendVivosCallSignal(
  channel: RealtimeChannel | null,
  payload: VivosCallSignalPayload
) {
  const resolvedChannel = await waitForVivosCallChannel(channel)

  if (!resolvedChannel) {
    console.warn("sendVivosCallSignal skipped: missing channel", payload.type)
    return { ok: false, reason: "missing-channel" }
  }

  let lastResult: unknown = null

  for (let attempt = 0; attempt < SIGNAL_SEND_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const result = await resolvedChannel.send({
        type: "broadcast",
        event: payload.type,
        payload,
      })

      lastResult = result

      if (result === "ok" || result === "timed out") {
        return result
      }

      if (attempt < SIGNAL_SEND_RETRY_ATTEMPTS - 1) {
        await sleep(SIGNAL_SEND_RETRY_MS)
      }
    } catch (error) {
      lastResult = error

      if (attempt < SIGNAL_SEND_RETRY_ATTEMPTS - 1) {
        await sleep(SIGNAL_SEND_RETRY_MS)
      }
    }
  }

  console.warn("sendVivosCallSignal failed after retry", payload.type, lastResult)
  return lastResult
}

export async function sendVivosCallInvite(args: {
  channel: RealtimeChannel | null
  callSessionId: string
  conversationId: string
  fromUserId: string
  toUserId: string
  callType: VivosCallType
}) {
  return sendVivosCallSignal(
    args.channel,
    buildVivosCallSignalPayload({
      type: "call_invite",
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      callType: args.callType,
    })
  )
}

export async function sendVivosCallAccept(args: {
  channel: RealtimeChannel | null
  callSessionId: string
  conversationId: string
  fromUserId: string
  toUserId?: string | null
  callType: VivosCallType
}) {
  await updateOwnPresence(args.fromUserId, "connected").catch((error) => {
    console.warn("sendVivosCallAccept presence refresh failed", error)
  })

  return sendVivosCallSignal(
    args.channel,
    buildVivosCallSignalPayload({
      type: "call_accept",
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      callType: args.callType,
    })
  )
}

export async function sendVivosCallReject(args: {
  channel: RealtimeChannel | null
  callSessionId: string
  conversationId: string
  fromUserId: string
  toUserId?: string | null
  callType: VivosCallType
}) {
  return sendVivosCallSignal(
    args.channel,
    buildVivosCallSignalPayload({
      type: "call_reject",
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      callType: args.callType,
    })
  )
}

export async function sendVivosCallEnd(args: {
  channel: RealtimeChannel | null
  callSessionId: string
  conversationId: string
  fromUserId: string
  toUserId?: string | null
  callType: VivosCallType
}) {
  return sendVivosCallSignal(
    args.channel,
    buildVivosCallSignalPayload({
      type: "call_end",
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      callType: args.callType,
    })
  )
}

export async function sendVivosWebRtcOffer(args: {
  channel: RealtimeChannel | null
  callSessionId: string
  conversationId: string
  fromUserId: string
  toUserId?: string | null
  callType: VivosCallType
  sdp: VivosSessionDescription
}) {
  return sendVivosCallSignal(
    args.channel,
    buildVivosCallSignalPayload({
      type: "webrtc_offer",
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      callType: args.callType,
      sdp: args.sdp,
    })
  )
}

export async function sendVivosWebRtcAnswer(args: {
  channel: RealtimeChannel | null
  callSessionId: string
  conversationId: string
  fromUserId: string
  toUserId?: string | null
  callType: VivosCallType
  sdp: VivosSessionDescription
}) {
  return sendVivosCallSignal(
    args.channel,
    buildVivosCallSignalPayload({
      type: "webrtc_answer",
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      callType: args.callType,
      sdp: args.sdp,
    })
  )
}

export async function sendVivosIceCandidate(args: {
  channel: RealtimeChannel | null
  callSessionId: string
  conversationId: string
  fromUserId: string
  toUserId?: string | null
  callType: VivosCallType
  candidate: VivosIceCandidate
}) {
  return sendVivosCallSignal(
    args.channel,
    buildVivosCallSignalPayload({
      type: "ice_candidate",
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      callType: args.callType,
      candidate: args.candidate,
    })
  )
}
