import { Stack, useRouter, useSegments } from "expo-router"
import { ActivityIndicator, AppState, View } from "react-native"
import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useRef } from "react"
import * as Notifications from "expo-notifications"
import { AppErrorBoundary } from "@/components/system/AppErrorBoundary"
import { useAuthSession } from "@/hooks/useAuthSession"
import { clearNativeBadge, requestNotificationPermissions } from "@/lib/notifications"
import { routeForegroundNotification, routeNotificationResponse } from "@/lib/notificationRouting"
import {
  registerVivosCallV2NotifeeEvents,
  setupVivosCallV2NotificationChannel,
} from "@/lib/calls-v2/notifeeCallV2"
import { stopVivosCallV2Ringtone } from "@/lib/calls-v2/callRingtone"
import { registerVivosCallV2FcmForegroundHandler } from "@/lib/calls-v2/fcmCallHandler"
import { consumePendingCallNotificationRoute } from "@/lib/calls-v2/callNotificationRoute"
import { setPendingVivosCallFromNotification } from "@/lib/calls-v2/callNotificationState"
import { startVivosGlobalCallInviteListener } from "@/lib/calls-v2/globalCallInviteListener"
import { startPresenceHeartbeat, stopPresenceHeartbeat } from "@/lib/presence/userPresence"
import { supabase } from "@/lib/supabase"
import { theme } from "@/lib/theme"

function asNotificationString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function getNotificationCallKind(data: Record<string, unknown>) {
  return asNotificationString(data.kind) || asNotificationString(data.type)
}

function routeForegroundCallNotification(router: ReturnType<typeof useRouter>, notification: Notifications.Notification) {
  const data = (notification.request.content.data ?? {}) as Record<string, unknown>
  const kind = getNotificationCallKind(data)

  if (kind !== "incoming_call_v2" && kind !== "call_v2") return false

  const conversationId = asNotificationString(data.conversationId)
  const callSessionId = asNotificationString(data.callSessionId)
  const fromUserId = asNotificationString(data.fromUserId) || asNotificationString(data.callerUserId)

  if (!conversationId || !callSessionId || !fromUserId) return false

  setPendingVivosCallFromNotification(
    {
      conversationId,
      callSessionId,
      fromUserId,
      callType: data.callType === "video" ? "video" : "audio",
    },
    "open"
  )

  router.push({ pathname: "/chat/[id]", params: { id: conversationId } })
  return true
}

export default function RootLayout() {
  const { isAuthenticated, loading } = useAuthSession()
  const segments = useSegments()
  const router = useRouter()
  const processedNotifIds = useRef<Set<string>>(new Set())

  const consumeCallRoute = useCallback(async () => {
    const route = await consumePendingCallNotificationRoute()
    if (!route) return

    if (route.action === "reject") {
      return
    }

    setPendingVivosCallFromNotification(
      {
        conversationId: route.conversationId,
        callSessionId: route.callSessionId,
        fromUserId: route.fromUserId,
        callType: route.callType,
      },
      route.action
    )

    router.push({ pathname: "/chat/[id]", params: { id: route.conversationId } })
  }, [router])

  useEffect(() => {
    if (loading) return

    const inAuthGroup = ["login", "signup"].includes(String(segments[0] || ""))

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login")
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace("/inbox")
    }
  }, [isAuthenticated, loading, segments, router])

  useEffect(() => {
    requestNotificationPermissions()
    setupVivosCallV2NotificationChannel()
    clearNativeBadge()

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        clearNativeBadge()
      }
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!isAuthenticated || loading) {
      stopPresenceHeartbeat()
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      startPresenceHeartbeat(data.session?.user?.id ?? null)
    })

    return () => {
      cancelled = true
      stopPresenceHeartbeat()
    }
  }, [isAuthenticated, loading])

  useEffect(() => {
    if (!isAuthenticated || loading) return

    let cancelled = false
    let cleanupGlobalCallListener: null | (() => Promise<void>) = null

    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user?.id ?? null
      if (cancelled || !userId) return

      cleanupGlobalCallListener = await startVivosGlobalCallInviteListener({
        userId,
        onIncomingInvite: (invite) => {
          setPendingVivosCallFromNotification(
            {
              conversationId: invite.conversationId,
              callSessionId: invite.callSessionId,
              fromUserId: invite.fromUserId,
              callType: invite.callType,
            },
            "open"
          )

          router.push({ pathname: "/chat/[id]", params: { id: invite.conversationId } })
        },
      })
    })

    return () => {
      cancelled = true
      if (cleanupGlobalCallListener) {
        void cleanupGlobalCallListener()
      }
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (!isAuthenticated || loading) return

    void consumeCallRoute()

    Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
      if (!lastResponse) return

      const id = lastResponse.notification.request.identifier
      if (processedNotifIds.current.has(id)) return

      processedNotifIds.current.add(id)
      routeNotificationResponse(router, lastResponse)
    })

    const notifeeUnsubscribe = registerVivosCallV2NotifeeEvents((conversationId) => {
      router.push({ pathname: "/chat/[id]", params: { id: conversationId } })
    })

    const fcmUnsubscribe = registerVivosCallV2FcmForegroundHandler((call) => {
      setPendingVivosCallFromNotification(
        {
          conversationId: call.conversationId,
          callSessionId: call.callSessionId,
          fromUserId: call.fromUserId,
          callType: call.callType,
        },
        "open"
      )

      router.push({ pathname: "/chat/[id]", params: { id: call.conversationId } })
    })

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        clearNativeBadge()
        void consumeCallRoute()
      }
    })

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      routeForegroundNotification(notification)
      routeForegroundCallNotification(router, notification)
    })

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = response.notification.request.identifier
      if (processedNotifIds.current.has(id)) return

      processedNotifIds.current.add(id)
      routeNotificationResponse(router, response)
    })

    return () => {
      notifeeUnsubscribe()
      fcmUnsubscribe()
      appStateSubscription.remove()
      receivedSubscription.remove()
      responseSubscription.remove()
      void stopVivosCallV2Ringtone()
    }
  }, [consumeCallRoute, isAuthenticated, loading, router])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bgBottom }}>
        <StatusBar style="light" />
        <ActivityIndicator color={theme.colors.text} />
      </View>
    )
  }

  return (
    <AppErrorBoundary>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bgBottom } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="members" />
        <Stack.Screen name="calls" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="chat/[id]" />
      </Stack>
    </AppErrorBoundary>
  )
}
