import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { isActiveVivosCallConversation, shouldBlockIncomingVivosCall } from "@/lib/calls-v2/activeCallRuntime"
import { startVivosCallV2Ringtone } from "@/lib/calls-v2/callRingtone"
import { setGlobalIncomingVivosCall } from "@/lib/calls-v2/globalIncomingCallState"
import { getVivosCallChannelName } from "@/lib/calls-v2/signaling"
import { VivosCallSignalPayload, VivosCallType } from "@/lib/calls-v2/types"

type ConversationRow = {
  id: string
}

type MemberProfileRow = {
  member_id: string
  name: string | null
  alias: string | null
  email: string | null
}

type GlobalCallInviteRuntime = {
  userId: string | null
  channels: RealtimeChannel[]
  refreshTimer: ReturnType<typeof setInterval> | null
  generation: number
  conversationIds: Set<string>
  callerNameCache: Map<string, string>
}

const runtime: GlobalCallInviteRuntime = {
  userId: null,
  channels: [],
  refreshTimer: null,
  generation: 0,
  conversationIds: new Set(),
  callerNameCache: new Map(),
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeCallType(value: unknown): VivosCallType {
  return value === "video" ? "video" : "audio"
}

function getCallerCacheKey(conversationId: string, fromUserId: string) {
  return `${conversationId}:${fromUserId}`
}

async function resolveCallerName(conversationId: string, fromUserId: string) {
  const cacheKey = getCallerCacheKey(conversationId, fromUserId)
  const cached = runtime.callerNameCache.get(cacheKey)
  if (cached) return cached

  try {
    const { data } = await supabase.rpc("get_conversation_members_with_profiles", {
      p_conversation_id: conversationId,
    })

    const caller = ((data ?? []) as MemberProfileRow[]).find((member) => member.member_id === fromUserId)
    const callerName = caller?.name?.trim() || caller?.alias?.trim() || caller?.email?.trim() || "Un membru VIVOS"

    runtime.callerNameCache.set(cacheKey, callerName)
    return callerName
  } catch (error) {
    console.warn("Global call caller name lookup failed", error)
    return "Un membru VIVOS"
  }
}

async function handleGlobalCallInvite(payload: unknown, userId: string, generation: number) {
  if (generation !== runtime.generation || runtime.userId !== userId) return

  const signal = payload as Partial<VivosCallSignalPayload>
  const conversationId = clean(signal.conversationId)
  const callSessionId = clean(signal.callSessionId)
  const fromUserId = clean(signal.fromUserId)
  const toUserId = clean(signal.toUserId)
  const callType = normalizeCallType(signal.callType)

  if (!conversationId || !callSessionId || !fromUserId) return
  if (fromUserId === userId) return
  if (toUserId && toUserId !== userId) return
  if (isActiveVivosCallConversation(conversationId)) return
  if (shouldBlockIncomingVivosCall({ conversationId, callSessionId })) return

  const callerName = await resolveCallerName(conversationId, fromUserId)

  if (generation !== runtime.generation || runtime.userId !== userId) return

  void startVivosCallV2Ringtone({
    callSessionId,
    callerName,
    callType,
    conversationId,
    fromUserId,
  })

  setGlobalIncomingVivosCall({
    conversationId,
    callSessionId,
    fromUserId,
    callerName,
    callType,
    action: "open",
  })
}

function subscribeConversation(conversationId: string, userId: string, generation: number) {
  const channelName = getVivosCallChannelName(conversationId)
  const channel = supabase
    .channel(channelName)
    .on("broadcast", { event: "call_invite" }, ({ payload }) => {
      void handleGlobalCallInvite(payload, userId, generation)
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Global call invite channel status", channelName, status)
      }
    })

  runtime.channels.push(channel)
}

async function refreshGlobalCallInviteSubscriptions(userId: string, generation: number) {
  if (generation !== runtime.generation || runtime.userId !== userId) return

  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) throw error
    if (generation !== runtime.generation || runtime.userId !== userId) return

    const nextIds = ((data ?? []) as ConversationRow[])
      .map((conversation) => clean(conversation.id))
      .filter((value): value is string => Boolean(value))

    nextIds.forEach((conversationId) => {
      if (runtime.conversationIds.has(conversationId)) return
      runtime.conversationIds.add(conversationId)
      subscribeConversation(conversationId, userId, generation)
    })
  } catch (error) {
    console.warn("Global call invite subscription refresh failed", error)
  }
}

export function startGlobalVivosCallInviteListener(userId?: string | null) {
  const cleanUserId = clean(userId)
  if (!cleanUserId) return

  if (runtime.userId === cleanUserId && runtime.channels.length > 0) {
    return
  }

  stopGlobalVivosCallInviteListener()

  runtime.userId = cleanUserId
  runtime.generation += 1
  runtime.conversationIds = new Set()
  runtime.callerNameCache = new Map()

  const generation = runtime.generation

  void refreshGlobalCallInviteSubscriptions(cleanUserId, generation)

  runtime.refreshTimer = setInterval(() => {
    void refreshGlobalCallInviteSubscriptions(cleanUserId, generation)
  }, 60 * 1000)
}

export function stopGlobalVivosCallInviteListener() {
  runtime.generation += 1
  runtime.userId = null
  runtime.conversationIds = new Set()
  runtime.callerNameCache = new Map()

  if (runtime.refreshTimer) {
    clearInterval(runtime.refreshTimer)
    runtime.refreshTimer = null
  }

  const channels = runtime.channels
  runtime.channels = []

  channels.forEach((channel) => {
    supabase.removeChannel(channel).catch((error) => {
      console.warn("Global call invite channel cleanup failed", error)
    })
  })
}
