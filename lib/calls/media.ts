import { CallType } from "@/types/call"

export type PreparedMediaSession = {
  callType: CallType
  localStream: MediaStream | null
  remoteStream: MediaStream | null
}

let currentMediaSession: PreparedMediaSession | null = null

export async function prepareNativeMedia(callType: CallType): Promise<PreparedMediaSession> {
  const session: PreparedMediaSession = {
    callType,
    localStream: null,
    remoteStream: null,
  }

  currentMediaSession = session
  return session
}

export function getCurrentMediaSession() {
  return currentMediaSession
}

export async function releaseNativeMedia() {
  try {
    currentMediaSession?.localStream?.getTracks?.().forEach((track) => track.stop())
    currentMediaSession?.remoteStream?.getTracks?.().forEach((track) => track.stop())
  } catch (error) {
    console.warn("Native media release failed", error)
  } finally {
    currentMediaSession = null
  }
}
