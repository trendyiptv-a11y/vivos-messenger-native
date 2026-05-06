import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { clearIncomingCallState, setIncomingCallState } from "@/lib/calls/callState"
import { IncomingCall } from "@/types/call"

type Props = {
  userId: string | null
  onIncomingCall?: (call: IncomingCall) => void
  onCallEnded?: (callSessionId: string) => void
}

type CallSessionRow = {
  id?: string
  caller_id?: string | null
  callee_id?: string | null
  status?: string | null
}

function isTerminalCallStatus(status?: string | null) {
  return status === "ended" || status === "rejected" || status === "missed" || status === "cancelled" || status === "canceled"
}

export function useIncomingCallChannel({ userId, onIncomingCall, onCallEnded }: Props) {
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`native-call-channel-${userId}`)
      .on("broadcast", { event: "call_invite" }, ({ payload }) => {
        if (!payload || payload.toUserId !== userId || payload.fromUserId === userId) return

        const call: IncomingCall = {
          callSessionId: String(payload.callSessionId),
          fromUserId: String(payload.fromUserId),
          callType: payload.callType === "video" ? "video" : "audio",
          conversationId: String(payload.conversationId),
        }

        setIncomingCallState(call)
        onIncomingCall?.(call)
      })
      .on("broadcast", { event: "call_end" }, ({ payload }) => {
        if (!payload?.callSessionId) return
        clearIncomingCallState()
        onCallEnded?.(String(payload.callSessionId))
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_sessions" },
        ({ new: nextRow }) => {
          const row = nextRow as CallSessionRow
          if (!row?.id || !isTerminalCallStatus(row.status)) return
          if (row.caller_id !== userId && row.callee_id !== userId) return

          clearIncomingCallState()
          onCallEnded?.(String(row.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onIncomingCall, onCallEnded])
}
