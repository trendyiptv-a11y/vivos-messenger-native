import { Stack, useRouter, useSegments } from "expo-router"
import { ActivityIndicator, AppState, View } from "react-native"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import * as Notifications from "expo-notifications"
import { AppErrorBoundary } from "@/components/system/AppErrorBoundary"
import { useAuthSession } from "@/hooks/useAuthSession"
import { clearNativeBadge, requestNotificationPermissions } from "@/lib/notifications"
import { routeForegroundNotification, routeInitialNotificationResponse, routeNotificationResponse } from "@/lib/notificationRouting"
import { registerNotifeeCallEvents, setupNotifeeCallChannel } from "@/lib/calls/notifeeCall"
import { stopCallRingtone } from "@/lib/calls/callRingtone"
import { theme } from "@/lib/theme"

export default function RootLayout() {
  const { isAuthenticated, loading } = useAuthSession()
  const segments = useSegments()
  const router = useRouter()

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
    setupNotifeeCallChannel()
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

    routeInitialNotificationResponse(router)

    const notifeeUnsubscribe = registerNotifeeCallEvents((conversationId) => {
      router.push({ pathname: "/chat/[id]", params: { id: conversationId } })
    })

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      routeForegroundNotification(notification)
    })

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      routeNotificationResponse(router, response)
    })

    return () => {
      notifeeUnsubscribe()
      receivedSubscription.remove()
      responseSubscription.remove()
      void stopCallRingtone()
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
