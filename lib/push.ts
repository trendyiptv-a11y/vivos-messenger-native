import { supabase } from "@/lib/supabase"

export type PushKind = "message" | "call" | "system"

type SendPushArgs = {
  targetUserId: string
  conversationId?: string
  type: PushKind
  title: string
  body: string
  data?: Record<string, unknown>
}

const DEFAULT_PUSH_ENDPOINT = "https://vivos-api.vercel.app/api/push"
const DEFAULT_PUSH_TEST_ENDPOINT = "https://vivos-api.vercel.app/api/push-test"

function getPushEndpoint() {
  return process.env.EXPO_PUBLIC_PUSH_API_URL || DEFAULT_PUSH_ENDPOINT
}

function getPushTestEndpoint() {
  return process.env.EXPO_PUBLIC_PUSH_TEST_API_URL || DEFAULT_PUSH_TEST_ENDPOINT
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

export async function sendVivosPush({ targetUserId, conversationId, type, title, body, data }: SendPushArgs) {
  try {
    if (!targetUserId || !body.trim()) return { ok: false, skipped: true }

    const accessToken = await getAccessToken()
    if (!accessToken) return { ok: false, skipped: true, reason: "missing-session" }

    const response = await fetch(getPushEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        targetUserId,
        conversationId,
        type,
        title,
        body,
        data,
      }),
    })

    const json = await response.json().catch(() => null)
    if (!response.ok) {
      console.warn("VIVOS push failed", response.status, json)
      return { ok: false, status: response.status, details: json }
    }

    return { ok: true, details: json }
  } catch (error) {
    console.warn("VIVOS push request failed", error)
    return { ok: false, error }
  }
}

export async function sendSelfPushDiagnostic() {
  try {
    const accessToken = await getAccessToken()
    if (!accessToken) return { ok: false, skipped: true, reason: "missing-session" }

    const response = await fetch(getPushTestEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    })

    const json = await response.json().catch(() => null)
    if (!response.ok) {
      console.warn("VIVOS self push failed", response.status, json)
      return { ok: false, status: response.status, details: json }
    }

    return { ok: true, details: json }
  } catch (error) {
    console.warn("VIVOS self push request failed", error)
    return { ok: false, error }
  }
}

export async function sendMessagePush(args: {
  targetUserId: string
  conversationId: string
  senderName: string
  message: string
  messageId?: string
}) {
  return sendVivosPush({
    targetUserId: args.targetUserId,
    conversationId: args.conversationId,
    type: "message",
    title: args.senderName || "VIVOS Messenger",
    body: args.message,
    data: {
      kind: "message",
      conversationId: args.conversationId,
      messageId: args.messageId ?? null,
    },
  })
}

export async function sendCallPush(args: {
  targetUserId: string
  callerUserId: string
  conversationId: string
  callerName: string
  callType: "audio" | "video"
  callSessionId?: string
}) {
  return sendVivosPush({
    targetUserId: args.targetUserId,
    conversationId: args.conversationId,
    type: "call",
    title: "VIVOS Messenger",
    body: `${args.callerName || "Cineva"} te sună ${args.callType === "video" ? "video" : "audio"}`,
    data: {
      kind: "incoming_call",
      conversationId: args.conversationId,
      callerUserId: args.callerUserId,
      fromUserId: args.callerUserId,
      callType: args.callType,
      callSessionId: args.callSessionId ?? null,
    },
  })
}
