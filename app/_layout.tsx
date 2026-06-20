import { Stack, useRouter, useSegments } from "expo-router"
import { ActivityIndicator, AppState, View } from "react-native"
import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useRef } from "react"
import * as Notifications from "expo-notifications"
import { AppErrorBoundary } from "@/components/system/AppErrorBoundary"
import { GlobalIncomingCallBanner } from "@/components/calls-v2/GlobalIncomingCallBanner"
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
import { startGlobalVivosCallInviteListener, stopGlobalVivosCallInviteListener } from "@/lib/calls-v2/globalCallInviteListener"
import { startPresenceHeartbeat, stopPresenceHeartbeat } from "@/lib/presence/userPresence"
import { supabase } from "@/lib/supabase"
import { theme } from "@/lib/theme"

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
      stopGlobalVivosCallInviteListener()
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const userId = data.session?.user?.id ?? null
      startPresenceHeartbeat(userId)
      startGlobalVivosCallInviteListener(userId)
    })

    return () => {
      cancelled = true
      stopPresenceHeartbeat()
      stopGlobalVivosCallInviteListener()
    }
  }, [isAuthenticated, loading])

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

    const fcmUnsubscribe = registerVivosCallV2FcmForegroundHandler(() => {
      // Foreground calls are handled by Supabase Realtime + call_sessions.
      // FCM foreground messages are acknowledged here only to prevent Notifee/system notification duplication.
    })

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        clearNativeBadge()
        void consumeCallRoute()
      }
    })

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      routeForegroundNotification(notification)
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
      <View style={{ flex: 1 }}>
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
        {isAuthenticated ? <GlobalIncomingCallBanner /> : null}
      </View>
    </AppErrorBoundary>
  )
}
