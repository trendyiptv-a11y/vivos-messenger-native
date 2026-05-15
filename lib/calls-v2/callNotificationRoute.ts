import AsyncStorage from "@react-native-async-storage/async-storage"
import { VivosCallType } from "@/lib/calls-v2/types"

const STORAGE_KEY = "vivos.pendingCallNotificationRoute.v1"

type PendingCallNotificationRoute = {
  conversationId: string
  callSessionId: string
  fromUserId: string
  callType: VivosCallType
  action: "accept" | "reject" | "open"
  createdAt: number
}

function clean(value?: string | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export async function savePendingCallNotificationRoute(route: Omit<PendingCallNotificationRoute, "createdAt">) {
  const conversationId = clean(route.conversationId)
  const callSessionId = clean(route.callSessionId)
  const fromUserId = clean(route.fromUserId)

  if (!conversationId || !callSessionId || !fromUserId) return false

  const payload: PendingCallNotificationRoute = {
    conversationId,
    callSessionId,
    fromUserId,
    callType: route.callType === "video" ? "video" : "audio",
    action: route.action,
    createdAt: Date.now(),
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  return true
}

export async function consumePendingCallNotificationRoute(maxAgeMs = 2 * 60 * 1000) {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  await AsyncStorage.removeItem(STORAGE_KEY)

  try {
    const route = JSON.parse(raw) as PendingCallNotificationRoute

    if (!route?.conversationId || !route?.callSessionId || !route?.fromUserId) return null
    if (Date.now() - Number(route.createdAt || 0) > maxAgeMs) return null

    return route
  } catch {
    return null
  }
}

export async function clearPendingCallNotificationRoute() {
  await AsyncStorage.removeItem(STORAGE_KEY)
}
