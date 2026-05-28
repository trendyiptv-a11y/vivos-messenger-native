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

type StoredVivosCallSignalRow = {
  id?: string
  payload?: VivosCallSignalPayload | null
  created_at?: string | null
}

const SIGNAL_STORE_TABLE = "vivos_call_signals"
const SIGNAL_CHANNEL_WAIT_ATTEMPTS = 40
const SIGNAL_CHANNEL_WAIT_MS = 200
const SIGNAL_BROADCAST_FAST_WAIT_ATTEMPTS = 6
const SIGNAL_SEND_RETRY_ATTEMPTS = 3
const SIGNAL_SEND_RETRY_MS = 220
const STORED_SIGNAL_LOOKBACK_MS = 2 * 60 * 1000
const STORED_SIGNAL_DRAIN_LIMIT = 160
const STORED_SIGNAL_DRAIN_INTERVAL_MS = 700
const STORED_SIGNAL_DRAIN_TICKS = 10
const STORED_SIGNAL_TTL_MS = 5 * 60 * 1000

let activeChannel: RealtimeChannel | null = null
const channelStatuses = new WeakMap<RealtimeChannel, string>()
const processedSignalKeys = new Set<string>()

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isChannelSubscribed(channel: RealtimeChannel | null) {
  return Boolean(channel && channelStatuses.get(channel) === "SUBSCRIBED")
}

function getChannelStatus(channel: RealtimeChannel | null) {
  if (!channel) return "MISSING"
  return channelStatuses.get(channel) || "UNKNOWN"
}

async function waitForVivosCallChannel(initialChannel: RealtimeChannel | null, attempts = SIGNAL_CHANNEL_WAIT_ATTEMPTS) {
  let candidate = initialChannel || activeChannel

  if (isChannelSubscribed(candidate)) return candidate

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await sleep(SIGNAL_CHANNEL_WAIT_MS)
    candidate = initialChannel || activeChannel

    if (isChannelSubscribed(candidate)) return candidate
  }

  console.warn("sendVivosCallSignal channel not SUBSCRIBED, current status:", getChannelStatus(candidate))
  return null
}

function getSignalDedupeKey(signal: VivosCallSignalPayload) {
  const bodyKey = signal.sdp
    ? JSON.stringify(signal.sdp).slice(0, 180)
    : signal.candidate
      ? JSON.stringify(signal.candidate).slice(0, 180)
      : ""

  return [
    signal.type,
    signal.callSessionId,
    signal.conversationId,
    signal.fromUserId,
    signal.toUserId || "",
    signal.createdAt || "",
    bodyKey,
  ].join("|")
}

function shouldProcessOnce(signal: VivosCallSignalPayload) {
  const key = getSignalDedupeKey(signal)

  if (processedSignalKeys.has(key)) return false

  if (processedSignalKeys.size > 700) {
    processedSignalKeys.clear()
  }

  processedSignalKeys.add(key)
  return true
}

function signalFromStoredRow(row: StoredVivosCallSignalRow | null | undefined) {
  const signal = row?.payload
  if (!signal?.type || !signal.callSessionId || !signal.conversationId || !signal.fromUserId) return null
  return signal
}

async function persistVivosCallSignal(payload: VivosCallSignalPayload) {
  const expiresAt = new Date(Date.now() + STORED_SIGNAL_TTL_MS).toISOString()

  const { error } = await supabase.from(SIGNAL_STORE_TABLE).insert({
    call_session_id: payload.callSessionId,
    conversation_id: payload.conversationId,
    from_user_id: payload.fromUserId,
    to_user_id: payload.toUserId ?? null,
    signal_type: payload.type,
    call_type: payload.callType,
    payload,
    expires_at: expiresAt,
  })

  if (error) {
    console.warn("persistVivosCallSignal failed", error.message)
    return false
  }

  return true
}

async function drainStoredVivosCallSignals(args: {
  conversationId: string
  userId: string
  active: () => boolean
  onSignal: SignalHandler
}) {
  const { conversationId, userId, active, onSignal } = args
  const since = new Date(Date.now() - STORED_SIGNAL_LOOKBACK_MS).toISOString()

  const { data, error } = await supabase
    .from(SIGNAL_STORE_TABLE)
    .select("id,payload,created_at")
    .eq("conversation_id", conversationId)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(STORED_SIGNAL_DRAIN_LIMIT)

  if (error) {
    console.warn("drainStoredVivosCallSignals failed", error.message)
    return
  }

  for (const row of (data || []) as StoredVivosCallSignalRow[]) {
    if (!active()) return

    const signal = signalFromStoredRow(row)
    if (!signal) continue
    if (!shouldProcessSignal(signal, userId)) continue
    if (!shouldProcessOnce(signal)) continue

    await onSignal(signal)
  }
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

export function getActiveVivosCallChannelStatus() {
  return getChannelStatus(activeChannel)
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
  let drainTimer: ReturnType<typeof setInterval> | null = null
  let drainTicks = 0

  const isActive = () => active

  const processSignal = async (signal: VivosCallSignalPayload) => {
    if (!active) return
    if (!shouldProcessSignal(signal, userId)) return
    if (!shouldProcessOnce(signal)) return
    await onSignal(signal)
  }

  const startStoredSignalDrain = () => {
    if (drainTimer) return

    const runDrain = () => {
      if (!active) return
      drainTicks += 1
      void drainStoredVivosCallSignals({ conversationId, userId, active: isActive, onSignal })

      if (drainTicks >= STORED_SIGNAL_DRAIN_TICKS && drainTimer) {
        clearInterval(drainTimer)
        drainTimer = null
      }
    }

    runDrain()
    drainTimer = setInterval(runDrain, STORED_SIGNAL_DRAIN_INTERVAL_MS)
  }

  const channel = supabase
    .channel(getVivosCallChannelName(conversationId))
    .on("broadcast", { event: "call_invite" }, async ({ payload }) => {
      await processSignal(payload as VivosCallSignalPayload)
    })
    .on("broadcast", { event: "call_accept" }, async ({ payload }) => {
      await processSignal(payload as VivosCallSignalPayload)
    })
    .on("broadcast", { event: "call_reject" }, async ({ payload }) => {
      await processSignal(payload as VivosCallSignalPayload)
    })
    .on("broadcast", { event: "call_end" }, async ({ payload }) => {
      await processSignal(payload as VivosCallSignalPayload)
    })
    .on("broadcast", { event: "webrtc_offer" }, async ({ payload }) => {
      await processSignal(payload as VivosCallSignalPayload)
    })
    .on("broadcast", { event: "webrtc_answer" }, async ({ payload }) => {
      await processSignal(payload as VivosCallSignalPayload)
    })
    .on("broadcast", { event: "ice_candidate" }, async ({ payload }) => {
      await processSignal(payload as VivosCallSignalPayload)
    })
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: SIGNAL_STORE_TABLE, filter: `conversation_id=eq.${conversationId}` },
      async ({ new: row }) => {
        const signal = signalFromStoredRow(row as StoredVivosCallSignalRow)
        if (!signal) return
        await processSignal(signal)
      }
    )
    .subscribe((status) => {
      channelStatuses.set(channel, status)
      console.log("VIVOS call v2 channel status:", status)

      if (status === "SUBSCRIBED") {
        startStoredSignalDrain()
      }
    })

  activeChannel = channel
  channelStatuses.set(channel, "CREATED")

  return {
    channel,
    close: async () => {
      active = false

      if (drainTimer) {
        clearInterval(drainTimer)
        drainTimer = null
      }

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
  const stored = await persistVivosCallSignal(payload)
  const resolvedChannel = await waitForVivosCallChannel(
    channel,
    stored ? SIGNAL_BROADCAST_FAST_WAIT_ATTEMPTS : SIGNAL_CHANNEL_WAIT_ATTEMPTS
  )

  if (!resolvedChannel) {
    if (stored) {
      console.warn("sendVivosCallSignal stored without broadcast", payload.type)
      return "stored"
    }

    const reason = "call signaling channel is not subscribed"
    console.warn("sendVivosCallSignal skipped:", reason, payload.type)
    throw new Error(`${reason}: ${payload.type}`)
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

  if (stored) {
    console.warn("sendVivosCallSignal broadcast failed but stored", payload.type, lastResult)
    return "stored"
  }

  console.warn("sendVivosCallSignal failed after retry", payload.type, lastResult)
  throw new Error(`sendVivosCallSignal failed: ${payload.type}`)
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
    buildVivosCallPayload({
      type: "call_reject",
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      callType: args.callType,
    })
  )
}

function buildVivosCallPayload(args: CreateCallSignalPayloadArgs): VivosCallSignalPayload {
  return buildVivosCallSignalPayload(args)
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
