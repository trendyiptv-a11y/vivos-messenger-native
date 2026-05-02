import { useCallback, useEffect, useState } from "react"
import { prepareNativeMedia, releaseNativeMedia } from "@/lib/calls/media"
import { CallType } from "@/types/call"

export function useCallMedia() {
  const [mediaReady, setMediaReady] = useState(false)
  const [activeCallType, setActiveCallType] = useState<CallType | null>(null)

  const startMedia = useCallback(async (callType: CallType) => {
    await prepareNativeMedia(callType)
    setActiveCallType(callType)
    setMediaReady(true)
  }, [])

  const stopMedia = useCallback(async () => {
    await releaseNativeMedia()
    setActiveCallType(null)
    setMediaReady(false)
  }, [])

  useEffect(() => {
    return () => {
      releaseNativeMedia()
    }
  }, [])

  return {
    mediaReady,
    activeCallType,
    startMedia,
    stopMedia,
  }
}
