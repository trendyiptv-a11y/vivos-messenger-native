import { supabase } from "@/lib/supabase"
import { VivosCallType } from "@/lib/calls-v2/types"

export type VivosCallHistoryStatus = "ringing" | "accepted" | "ended" | "rejected" | "missed" | "cancelled" | "failed"

type CreateCallHistoryArgs = {
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

export async function createCallHistorySession(args: CreateCallHistoryArgs) {
  if (!args.conversationId || !args.callerId || !args.calleeId) {
    return { ok: false, historyId: null, reason: "missing-fields" }
  }

  try {
    const { data, error } = await supabase
      .from("call_sessions")
      .insert({
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

    const { error } = await supabase
      .from("call_sessions")
      .update(patch)
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
