import { supabase } from "@/lib/supabase"
import { VivosCallType } from "@/lib/calls-v2/types"

export type VivosCallHistoryStatus = "ringing" | "accepted" | "ended" | "rejected" | "missed" | "cancelled" | "failed"

type CreateCallHistoryArgs = {
  callSessionId: string
  conversationId: string
  callerId: string
  calleeId: string
  callType: VivosCallType
}

type UpdateCallHistoryArgs = {
  historyId?: string | null
  status: VivosCallHistoryStatus
  answered?: boolean
  ended?: boolean
}

type UpdateCallHistoryBySessionArgs = {
  callSessionId?: string | null
  status: VivosCallHistoryStatus
  answered?: boolean
  ended?: boolean
}

function buildStatusPatch(args: { status: VivosCallHistoryStatus; answered?: boolean; ended?: boolean }) {
  const patch: Record<string, string> = {
    status: args.status,
  }

  const timestamp = new Date().toISOString()

  if (args.answered) {
    patch.answered_at = timestamp
  }

  if (args.ended) {
    patch.ended_at = timestamp
  }

  return patch
}

export async function createCallHistorySession(args: CreateCallHistoryArgs) {
  if (!args.callSessionId || !args.conversationId || !args.callerId || !args.calleeId) {
    return { ok: false, historyId: null, reason: "missing-fields" }
  }

  try {
    const { data, error } = await supabase
      .from("call_sessions")
      .insert({
        call_session_id: args.callSessionId,
        conversation_id: args.conversationId,
        caller_id: args.callerId,
        callee_id: args.calleeId,
        status: "ringing",
        call_type: args.callType,
      })
      .select("id")
      .single()

    if (error) {
      console.warn("V2 call history create failed", error.message)
      return { ok: false, historyId: null, reason: error.message }
    }

    return { ok: true, historyId: String((data as any)?.id || "") || null }
  } catch (error) {
    console.warn("V2 call history create failed", error)
    return { ok: false, historyId: null, reason: error instanceof Error ? error.message : String(error) }
  }
}

export async function updateCallHistorySession(args: UpdateCallHistoryArgs) {
  if (!args.historyId) {
    return { ok: false, skipped: true, reason: "missing-history-id" }
  }

  try {
    const { error } = await supabase
      .from("call_sessions")
      .update(buildStatusPatch(args))
      .eq("id", args.historyId)

    if (error) {
      console.warn("V2 call history update failed", error.message)
      return { ok: false, reason: error.message }
    }

    return { ok: true }
  } catch (error) {
    console.warn("V2 call history update failed", error)
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

export async function updateCallHistorySessionByCallSessionId(args: UpdateCallHistoryBySessionArgs) {
  if (!args.callSessionId) {
    return { ok: false, skipped: true, reason: "missing-call-session-id" }
  }

  try {
    const { error } = await supabase
      .from("call_sessions")
      .update(buildStatusPatch(args))
      .eq("call_session_id", args.callSessionId)

    if (error) {
      console.warn("V2 call history update by session failed", error.message)
      return { ok: false, reason: error.message }
    }

    return { ok: true }
  } catch (error) {
    console.warn("V2 call history update by session failed", error)
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

export function markCallHistoryAccepted(historyId?: string | null) {
  return updateCallHistorySession({ historyId, status: "accepted", answered: true })
}

export function markCallHistoryEnded(historyId?: string | null) {
  return updateCallHistorySession({ historyId, status: "ended", ended: true })
}

export function markCallHistoryRejected(historyId?: string | null) {
  return updateCallHistorySession({ historyId, status: "rejected", ended: true })
}

export function markCallHistoryCancelled(historyId?: string | null) {
  return updateCallHistorySession({ historyId, status: "cancelled", ended: true })
}

export function markCallHistoryFailed(historyId?: string | null) {
  return updateCallHistorySession({ historyId, status: "failed", ended: true })
}

export function markCallHistoryAcceptedByCallSessionId(callSessionId?: string | null) {
  return updateCallHistorySessionByCallSessionId({ callSessionId, status: "accepted", answered: true })
}

export function markCallHistoryEndedByCallSessionId(callSessionId?: string | null) {
  return updateCallHistorySessionByCallSessionId({ callSessionId, status: "ended", ended: true })
}

export function markCallHistoryRejectedByCallSessionId(callSessionId?: string | null) {
  return updateCallHistorySessionByCallSessionId({ callSessionId, status: "rejected", ended: true })
}

export function markCallHistoryCancelledByCallSessionId(callSessionId?: string | null) {
  return updateCallHistorySessionByCallSessionId({ callSessionId, status: "cancelled", ended: true })
}
