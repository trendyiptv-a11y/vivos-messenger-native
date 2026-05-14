import { supabase } from "@/lib/supabase"
import { VivosCallType } from "@/lib/calls-v2/types"

type NotifyVivosCallV2Args = {
  conversationId: string
  callSessionId: string
  fromUserId: string
  toUserId: string
  callType: VivosCallType
  callerName?: string | null
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

async function postVivosCallV2Notification(args: NotifyVivosCallV2Args & { event?: "incoming" | "cancelled" }) {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    console.warn("V2 call notify skipped: missing access token")
    return { ok: false, reason: "missing-access-token" }
  }

  try {
    const response = await fetch("https://vivos-api.vercel.app/api/call-v2-notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        event: args.event || "incoming",
        conversationId: args.conversationId,
        callSessionId: args.callSessionId,
        fromUserId: args.fromUserId,
        toUserId: args.toUserId,
        callType: args.callType,
        callerName: args.callerName || "Un membru VIVOS",
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.warn("V2 call notify failed", response.status, data)
      return {
        ok: false,
        status: response.status,
        data,
      }
    }

    return {
      ok: true,
      data,
    }
  } catch (error) {
    console.warn("V2 call notify error", error)

    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function notifyVivosCallV2(args: NotifyVivosCallV2Args) {
  return postVivosCallV2Notification({ ...args, event: "incoming" })
}

export async function notifyVivosCallV2Cancelled(args: NotifyVivosCallV2Args) {
  return postVivosCallV2Notification({ ...args, event: "cancelled" })
}
