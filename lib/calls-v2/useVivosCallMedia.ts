import { useCallback, useState } from "react"
import { VivosCallType } from "@/lib/calls-v2/types"
import {
  getMediaSnapshot,
  setCameraEnabled,
  setMicrophoneEnabled,
  startLocalMedia,
  stopLocalMedia,
  switchCamera,
} from "@/lib/calls-v2/media"

type MediaState = {
  loading: boolean
  error: string | null
  localStreamURL: string | null
  audioTracks: number
  videoTracks: number
  microphoneEnabled: boolean
  cameraEnabled: boolean
}

const initialMediaState: MediaState = {
  loading: false,
  error: null,
  localStreamURL: null,
  audioTracks: 0,
  videoTracks: 0,
  microphoneEnabled: true,
  cameraEnabled: false,
}

export function useVivosCallMedia() {
  const [mediaState, setMediaState] = useState<MediaState>(initialMediaState)

  const refreshSnapshot = useCallback(() => {
    const snapshot = getMediaSnapshot()

    setMediaState((current) => ({
      ...current,
      localStreamURL: snapshot.localStreamURL,
      audioTracks: snapshot.audioTracks,
      videoTracks: snapshot.videoTracks,
      microphoneEnabled: snapshot.microphoneEnabled,
      cameraEnabled: snapshot.cameraEnabled,
    }))

    return snapshot
  }, [])

  const start = useCallback(
    async (callType: VivosCallType) => {
      setMediaState((current) => ({
        ...current,
        loading: true,
        error: null,
      }))

      try {
        const result = await startLocalMedia(callType)

        setMediaState({
          loading: false,
          error: null,
          localStreamURL: result.streamURL,
          audioTracks: result.audioTracks,
          videoTracks: result.videoTracks,
          microphoneEnabled: result.audioTracks > 0,
          cameraEnabled: result.videoTracks > 0,
        })

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        setMediaState((current) => ({
          ...current,
          loading: false,
          error: message,
        }))

        throw error
      }
    },
    []
  )

  const stop = useCallback(async () => {
    await stopLocalMedia()
    setMediaState(initialMediaState)
  }, [])

  const toggleMicrophone = useCallback(() => {
    const next = !getMediaSnapshot().microphoneEnabled
    const applied = setMicrophoneEnabled(next)
    refreshSnapshot()
    return applied
  }, [refreshSnapshot])

  const toggleCamera = useCallback(async () => {
    const next = !getMediaSnapshot().cameraEnabled
    const applied = await setCameraEnabled(next)
    refreshSnapshot()
    return applied
  }, [refreshSnapshot])

  const switchLocalCamera = useCallback(async () => {
    const switched = await switchCamera()
    refreshSnapshot()
    return switched
  }, [refreshSnapshot])

  return {
    mediaState,
    start,
    stop,
    toggleMicrophone,
    toggleCamera,
    switchLocalCamera,
    refreshSnapshot,
  }
}
