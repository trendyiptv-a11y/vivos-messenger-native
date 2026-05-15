import { supabase } from "@/lib/supabase"
import {
  getActiveVivosCallChannel,
  getVivosCallChannelName,
  sendVivosCallReject,
} from "@/lib/calls-v2/signaling"
import { notifyVivosCallV2Cancelled } from "@/lib/calls-v2/callNotify"
import { VivosCallType } from "@/lib/calls-v2/types"

type RejectCallFromNotificationArgs = {
  conversationId: string
  callSessionId: string
  callerUserId: string
  callType: VivosCallType
}

function waitForChannelSubscribed(channel: ReturnType<typeof supabase.channel>, timeoutMs = 2500) {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve(false)
    }, timeoutMs)

    channel.subscribe((status) => {
      if (settled) return

      if (status === "SUBSCRIBED") {
        settled = true
        clearTimeout(timer)
        resolve(true)
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        settled = true
        clearTimeout(timer)
        resolve(false)
      }
    })
  })
}

export async function rejectVivosCallFromNotification(args: RejectCallFromNotificationArgs) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const currentUserId = session?.user?.id
  if (!currentUserId) {
    return { ok: false, reason: "missing-session" }
  }

  const activeChannel = getActiveVivosCallChannel()

  if (activeChannel) {
    const result = await sendVivosCallReject({
      channel: activeChannel,
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      fromUserId: currentUserId,
      toUserId: args.callerUserId,
      callType: args.callType,
    })

    void notifyVivosCallV2Cancelled({
      conversationId: args.conversationId,
      callSessionId: args.callSessionId,
      fromUserId: currentUserId,
      toUserId: args.callerUserId,
      callType: args.callType,
      callerName: "VIVOS",
    })

    return { ok: true, provider: "active-channel", result }
  }

  const tempChannel = supabase.channel(getVivosCallChannelName(args.conversationId))

  const subscribed = await waitForChannelSubscribed(tempChannel)

  try {
    if (!subscribed) {
      void notifyVivosCallV2Cancelled({
        conversationId: args.conversationId,
        callSessionId: args.callSessionId,
        fromUserId: currentUserId,
        toUserId: args.callerUserId,
        callType: args.callType,
        callerName: "VIVOS",
      })

      return { ok: false, reason: "channel-not-subscribed" }
    }

    const result = await sendVivosCallReject({
      channel: tempChannel,
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      fromUserId: currentUserId,
      toUserId: args.callerUserId,
      callType: args.callType,
    })

    void notifyVivosCallV2Cancelled({
      conversationId: args.conversationId,
      callSessionId: args.callSessionId,
      fromUserId: currentUserId,
      toUserId: args.callerUserId,
      callType: args.callType,
      callerName: "VIVOS",
    })

    return { ok: true, provider: "temp-channel", result }
  } finally {
    await supabase.removeChannel(tempChannel).catch(() => {})
  }
}
