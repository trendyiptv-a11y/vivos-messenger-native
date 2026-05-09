import { Stack, useRouter, useSegments } from "expo-router"
import { ActivityIndicator, AppState, View } from "react-native"
import { StatusBar } from "expo-status-bar"
import { useEffect, useRef } from "react"
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
import { theme } from "@/lib/theme"

export default function RootLayout() {
  const { isAuthenticated, loading } = useAuthSession()
  const segments = useSegments()
  const router = useRouter()
  const processedNotifIds = useRef<Set<string>>(new Set())

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
    if (!isAuthenticated || loading) return

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
      receivedSubscription.remove()
      responseSubscription.remove()
      void stopVivosCallV2Ringtone()
    }
  }, [isAuthenticated, loading, router])

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
        <Stack.Screen name="calls" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="chat/[id]" />
      </Stack>
    </AppErrorBoundary>
  )
}
