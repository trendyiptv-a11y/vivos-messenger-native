import { AppState, AppStateStatus } from "react-native"
import { supabase } from "@/lib/supabase"

export type UserPresenceStatus = "online" | "recent" | "offline" | "unknown"

export type UserPresenceRow = {
  user_id: string
  last_seen_at: string | null
  status?: string | null
  updated_at?: string | null
}

export type UserPresenceInfo = {
  userId: string
  status: UserPresenceStatus
  label: string
  lastSeenAt: string | null
}

const ONLINE_MS = 90 * 1000
const RECENT_MS = 5 * 60 * 1000
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let appStateSubscription: { remove: () => void } | null = null
let activeUserId: string | null = null

function nowIso() {
  return new Date().toISOString()
}

export function getPresenceInfo(userId: string, row?: UserPresenceRow | null, now = Date.now()): UserPresenceInfo {
  const lastSeenAt = row?.last_seen_at || row?.updated_at || null

  if (!lastSeenAt) {
    return {
      userId,
      status: "unknown",
      label: "Status necunoscut",
      lastSeenAt: null,
    }
  }

  const ageMs = now - new Date(lastSeenAt).getTime()

  if (Number.isFinite(ageMs) && ageMs <= ONLINE_MS) {
    return {
      userId,
      status: "online",
      label: "Online",
      lastSeenAt,
    }
  }

  if (Number.isFinite(ageMs) && ageMs <= RECENT_MS) {
    return {
      userId,
      status: "recent",
      label: "Activ recent",
      lastSeenAt,
    }
  }

  return {
    userId,
    status: "offline",
    label: "Offline",
    lastSeenAt,
  }
}

export async function updateOwnPresence(userId: string | null, status: "online" | "offline" = "online") {
  if (!userId) return { ok: false, skipped: true }

  try {
    const timestamp = nowIso()
    const { error } = await supabase.from("user_presence").upsert(
      {
        user_id: userId,
        status,
        last_seen_at: timestamp,
        updated_at: timestamp,
      },
      { onConflict: "user_id" }
    )

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function fetchPresenceMap(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  if (!uniqueIds.length) return {}

  try {
    const { data, error } = await supabase
      .from("user_presence")
      .select("user_id, status, last_seen_at, updated_at")
      .in("user_id", uniqueIds)

    if (error) {
      console.warn("Presence fetch failed", error.message)
      return {}
    }

    return ((data ?? []) as UserPresenceRow[]).reduce<Record<string, UserPresenceRow>>((acc, row) => {
      if (row.user_id) acc[row.user_id] = row
      return acc
    }, {})
  } catch (error) {
    console.warn("Presence fetch failed", error)
    return {}
  }
}

function stopPresenceHeartbeatInternal() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  if (appStateSubscription) {
    appStateSubscription.remove()
    appStateSubscription = null
  }
}

export function startPresenceHeartbeat(userId: string | null) {
  if (!userId) return () => {}

  if (activeUserId === userId && heartbeatTimer) {
    return stopPresenceHeartbeat
  }

  stopPresenceHeartbeatInternal()
  activeUserId = userId

  void updateOwnPresence(userId, "online")

  heartbeatTimer = setInterval(() => {
    void updateOwnPresence(activeUserId, "online")
  }, 45 * 1000)

  appStateSubscription = AppState.addEventListener("change", (state: AppStateStatus) => {
    if (!activeUserId) return

    if (state === "active") {
      void updateOwnPresence(activeUserId, "online")
      return
    }

    void updateOwnPresence(activeUserId, "offline")
  })

  return stopPresenceHeartbeat
}

export function stopPresenceHeartbeat() {
  const userId = activeUserId
  stopPresenceHeartbeatInternal()
  activeUserId = null

  if (userId) {
    void updateOwnPresence(userId, "offline")
  }
}
