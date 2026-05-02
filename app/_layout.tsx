import { Stack, useRouter, useSegments } from "expo-router"
import { ActivityIndicator, View } from "react-native"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { useAuthSession } from "@/hooks/useAuthSession"
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bgBottom }}>
        <StatusBar style="light" />
        <ActivityIndicator color={theme.colors.text} />
      </View>
    )
  }

  return (
    <>
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
    </>
  )
}
