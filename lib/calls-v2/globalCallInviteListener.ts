import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { isActiveVivosCallConversation, shouldBlockIncomingVivosCall } from "@/lib/calls-v2/activeCallRuntime"
import { startVivosCallV2Ringtone, stopVivosCallV2Ringtone } from "@/lib/calls-v2/callRingtone"
import { clearGlobalIncomingVivosCall, getGlobalIncomingVivosCall, setGlobalIncomingVivosCall } from "@/lib/calls-v2/globalIncomingCallState"
import { VivosCallType } from "@/lib/calls-v2/types"

type CallSessionRow = {
  id: string
  call_session_id: string | null
  conversation_id: string
  caller_id: string
  callee_id: string
  status: string | null
  call_type: string | null
  created_at?: string | null
}

type MemberProfileRow = {
  member_id: string
  name: string | null
  alias: string | null
  email: string | null
}

type Runtime = {
  userId: string | null
  channel: RealtimeChannel | null
  timer: ReturnType<typeof setInterval> | null
  generation: number
  names: Map<string, string>
  seen: Set<string>
}

const runtime: Runtime = {
  userId: null,
  channel: null,
  timer: null,
  generation: 0,
  names: new Map(),
  seen: new Set(),
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeCallType(value: unknown): VivosCallType {
  return value === "video" ? "video" : "audio"
}

function rowCallSessionId(row: CallSessionRow) {
  return clean(row.call_session_id) || clean(row.id)
}

function isFresh(row: CallSessionRow) {
  if (row.status !== "ringing") return false
  if (!row.created_at) return true
  const createdAt = new Date(row.created_at).getTime()
  return !Number.isFinite(createdAt) || Date.now() - createdAt < 90_000
}

async function callerName(conversationId: string, callerId: string) {
  const key = `${conversationId}:${callerId}`
  const cached = runtime.names.get(key)
  if (cached) return cached

  try {
    const { data } = await supabase.rpc("get_conversation_members_with_profiles", {
      p_conversation_id: conversationId,
    })
    const caller = ((data ?? []) as MemberProfileRow[]).find((member) => member.member_id === callerId)
    const name = caller?.name?.trim() || caller?.alias?.trim() || caller?.email?.trim() || "Un membru VIVOS"
    runtime.names.set(key, name)
    return name
  } catch {
    return "Un membru VIVOS"
  }
}

async function showIncoming(row: CallSessionRow, userId: string, generation: number) {
  if (generation !== runtime.generation || runtime.userId !== userId) return
  if (!isFresh(row)) return

  const callSessionId = rowCallSessionId(row)
  const conversationId = clean(row.conversation_id)
  const fromUserId = clean(row.caller_id)
  const toUserId = clean(row.callee_id)
  const callType = normalizeCallType(row.call_type)

  if (!callSessionId || !conversationId || !fromUserId || !toUserId) return
  if (toUserId !== userId || fromUserId === userId) return
  if (runtime.seen.has(callSessionId)) return
  if (isActiveVivosCallConversation(conversationId)) return
  if (shouldBlockIncomingVivosCall({ conversationId, callSessionId })) return

  runtime.seen.add(callSessionId)
  const name = await callerName(conversationId, fromUserId)

  if (generation !== runtime.generation || runtime.userId !== userId) return

  void startVivosCallV2Ringtone({
    callSessionId,
    callerName: name,
    callType,
    conversationId,
    fromUserId,
  })

  setGlobalIncomingVivosCall({
    conversationId,
    callSessionId,
    fromUserId,
    callerName: name,
    callType,
    action: "open",
  })
}

async function handleRow(row: CallSessionRow, userId: string, generation: number) {
  const callSessionId = rowCallSessionId(row)
  if (!callSessionId) return

  if (row.status === "ringing") {
    await showIncoming(row, userId, generation)
    return
  }

  if (getGlobalIncomingVivosCall()?.callSessionId === callSessionId) {
    clearGlobalIncomingVivosCall(callSessionId)
    void stopVivosCallV2Ringtone(callSessionId)
  }
}

async function refresh(userId: string, generation: number) {
  if (generation !== runtime.generation || runtime.userId !== userId) return

  try {
    const { data, error } = await supabase
      .from("call_sessions")
      .select("id, call_session_id, conversation_id, caller_id, callee_id, status, call_type, created_at")
      .eq("callee_id", userId)
      .eq("status", "ringing")
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) throw error

    for (const row of (data ?? []) as CallSessionRow[]) {
      await showIncoming(row, userId, generation)
    }
  } catch (error) {
    console.warn("VIVOS persistent incoming call refresh failed", error)
  }
}

function subscribe(userId: string, generation: number) {
  const channel = supabase
    .channel(`vivos-call-sessions:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "call_sessions", filter: `callee_id=eq.${userId}` },
      (payload) => {
        const row = (payload.new ?? payload.old) as CallSessionRow | null
        if (row) void handleRow(row, userId, generation)
      }
    )
    .subscribe((status) => {
      console.log("VIVOS persistent incoming call channel", status)
    })

  runtime.channel = channel
}

export function startGlobalVivosCallInviteListener(userId?: string | null) {
  const id = clean(userId)
  if (!id) return

  if (runtime.userId === id && runtime.channel) {
    void refresh(id, runtime.generation)
    return
  }

  stopGlobalVivosCallInviteListener()

  runtime.userId = id
  runtime.generation += 1
  runtime.names = new Map()
  runtime.seen = new Set()

  const generation = runtime.generation
  subscribe(id, generation)
  void refresh(id, generation)

  runtime.timer = setInterval(() => {
    void refresh(id, generation)
  }, 15_000)
}

export function stopGlobalVivosCallInviteListener() {
  runtime.generation += 1
  runtime.userId = null
  runtime.names = new Map()
  runtime.seen = new Set()

  if (runtime.timer) {
    clearInterval(runtime.timer)
    runtime.timer = null
  }

  const channel = runtime.channel
  runtime.channel = null

  if (channel) {
    supabase.removeChannel(channel).catch((error) => {
      console.warn("VIVOS persistent incoming call cleanup failed", error)
    })
  }
}
