import { supabase } from "@/lib/supabase"
import { CallType } from "@/types/call"

export async function createOutgoingCallSession(args: {
  conversationId: string
  callerId: string
  calleeId: string
  callType: CallType
}) {
  const { data, error } = await supabase
    .from("call_sessions")
    .insert({
      conversation_id: args.conversationId,
      caller_id: args.callerId,
      callee_id: args.calleeId,
      status: "ringing",
      call_type: args.callType,
    })
    .select("id, conversation_id, caller_id, callee_id, status, call_type, created_at")
    .single()

  if (error) throw error
  return data
}

export async function logCallEvent(args: {
  callSessionId: string
  actorId: string
  eventType: string
  payload?: Record<string, unknown>
}) {
  const { error } = await supabase.from("call_events").insert({
    call_session_id: args.callSessionId,
    actor_id: args.actorId,
    event_type: args.eventType,
    payload: args.payload ?? {},
  })

  if (error) throw error
}

export async function endCallSession(callSessionId: string) {
  const { error } = await supabase
    .from("call_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", callSessionId)

  if (error) throw error
}
