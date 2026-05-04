import { useEffect } from "react"
import { useState } from "react"
import { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { registerPushToken } from "@/lib/notifications"

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)

      if (data.session?.user?.id) {
        registerPushToken(data.session.user.id)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)

      if (nextSession?.user?.id) {
        registerPushToken(nextSession.user.id)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    session,
    loading,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.user),
  }
}
