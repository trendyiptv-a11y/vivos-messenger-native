import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { clearIncomingCallState, setIncomingCallState } from "@/lib/calls/callState"
import { IncomingCall } from "@/types/call"

type Props = {
  userId: string | null
  onIncomingCall?: (call: IncomingCall) => void
  onCallEnded?: (callSessionId: string) => void
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onIncomingCall, onCallEnded])
}
