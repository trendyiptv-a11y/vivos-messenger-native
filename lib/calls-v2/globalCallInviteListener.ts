import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { getVivosCallChannelName } from "@/lib/calls-v2/signaling"
import { VivosCallSignalPayload } from "@/lib/calls-v2/types"
import { shouldBlockIncomingVivosCall } from "@/lib/calls-v2/activeCallRuntime"

type ConversationRow = {
  id: string
}

export type VivosGlobalIncomingCallInvite = {
  conversationId: string
  callSessionId: string
  fromUserId: string
  callType: "audio" | "video"
}

type StartGlobalCallInviteListenerArgs = {
  userId: string
  onIncomingInvite: (invite: VivosGlobalIncomingCallInvite) => void | Promise<void>
}

function isValidIncomingInvite(signal: VivosCallSignalPayload | null | undefined, userId: string) {
  if (!signal) return false
  if (signal.type !== "call_invite") return false
  if (!signal.conversationId) return false
  if (!signal.callSessionId) return false
  if (!signal.fromUserId) return false
  if (signal.fromUserId === userId) return false
  if (signal.toUserId && signal.toUserId !== userId) return false
  return true
}

export async function startVivosGlobalCallInviteListener({
  userId,
  onIncomingInvite,
}: StartGlobalCallInviteListenerArgs) {
  let active = true
  const channels: RealtimeChannel[] = []

  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.warn("Global call invite listener conversation load failed", error)
    return async () => {}
  }

  const conversationIds = ((data ?? []) as ConversationRow[])
    .map((row) => row.id)
    .filter(Boolean)

  for (const conversationId of conversationIds) {
    const channel = supabase
      .channel(`global-${getVivosCallChannelName(conversationId)}`)
      .on("broadcast", { event: "call_invite" }, async ({ payload }) => {
        if (!active) return

        const signal = payload as VivosCallSignalPayload
        if (!isValidIncomingInvite(signal, userId)) return

        if (
          shouldBlockIncomingVivosCall({
            conversationId: signal.conversationId,
            callSessionId: signal.callSessionId,
          })
        ) {
          return
        }

        await onIncomingInvite({
          conversationId: signal.conversationId,
          callSessionId: signal.callSessionId,
          fromUserId: signal.fromUserId,
          callType: signal.callType === "video" ? "video" : "audio",
        })
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("Global call invite listener channel error", conversationId)
        }
      })

    channels.push(channel)
  }

  return async () => {
    active = false
    await Promise.all(
      channels.map((channel) =>
        supabase.removeChannel(channel).catch((error) => {
          console.warn("Global call invite listener cleanup failed", error)
        })
      )
    )
  }
}
