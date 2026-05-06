import { IceCandidateLike, NativeStreamViewState, SessionDescriptionLike, WebRtcConnectionStateLike } from "@/types/webrtc"
import { CallType } from "@/types/call"
import { IceServerConfig } from "@/lib/calls/turn"
import { getWebRtcRuntimeState } from "@/lib/calls/webrtcRuntime"
import { WEBRTC_PLACEHOLDERS } from "@/lib/calls/webrtcConfig"
import { setNativeSpeakerphone, startNativeAudioRoute, stopNativeAudioRoute } from "@/lib/calls/audioRoute"

type ReactNativeWebRtcModule = typeof import("react-native-webrtc")
type PeerConnectionLike = InstanceType<ReactNativeWebRtcModule["RTCPeerConnection"]>
type StreamLike = import("react-native-webrtc").MediaStream

type NativeWebRtcInternals = {
  moduleRef: ReactNativeWebRtcModule | null
  peerConnection: PeerConnectionLike | null
  localStream: StreamLike | null
  remoteStream: StreamLike | null
  transceiversReady: boolean
}

export type NativeWebRtcSession = NativeStreamViewState & {
  callType: CallType
  diagnostics: string[]
  iceServers: IceServerConfig[]
  microphoneEnabled: boolean
  cameraEnabled: boolean
  speakerEnabled: boolean
  remoteAudioTracks: number
  remoteVideoTracks: number
}

let currentNativeSession: NativeWebRtcSession | null = null
let currentIceServers: IceServerConfig[] = []
let localIceCandidateHandler: ((candidate: IceCandidateLike) => Promise<void> | void) | null = null
let internals: NativeWebRtcInternals = {
  moduleRef: null,
  peerConnection: null,
  localStream: null,
  remoteStream: null,
  transceiversReady: false,
}

function pushDiagnostic(message: string) {
  if (!currentNativeSession) return
  currentNativeSession.diagnostics = [...currentNativeSession.diagnostics.slice(-20), message]
}

function setConnectionState(state: WebRtcConnectionStateLike) {
  if (!currentNativeSession) return
  currentNativeSession.connectionState = state
}

function getModuleRef(): ReactNativeWebRtcModule | null {
  if (internals.moduleRef) return internals.moduleRef
  try {
    internals.moduleRef = require("react-native-webrtc") as ReactNativeWebRtcModule
    return internals.moduleRef
  } catch {
    return null
  }
}

function ensureRemoteStream(moduleRef: ReactNativeWebRtcModule | null) {
  if (internals.remoteStream) return internals.remoteStream
  if (!moduleRef?.MediaStream) return null
  internals.remoteStream = new moduleRef.MediaStream()
  return internals.remoteStream
}

function syncStreamURLs() {
  if (!currentNativeSession) return
  currentNativeSession.localURL = internals.localStream?.toURL?.() ?? null
  currentNativeSession.remoteURL = internals.remoteStream?.toURL?.() ?? null
  currentNativeSession.localReady = Boolean(currentNativeSession.localURL)
  currentNativeSession.remoteAudioTracks = internals.remoteStream?.getAudioTracks?.().length ?? 0
  currentNativeSession.remoteVideoTracks = internals.remoteStream?.getVideoTracks?.().length ?? 0
  currentNativeSession.remoteReady = Boolean(currentNativeSession.remoteURL && (currentNativeSession.remoteAudioTracks > 0 || currentNativeSession.remoteVideoTracks > 0))
}

function normalizeIceCandidate(candidate: any): IceCandidateLike | null {
  if (!candidate) return null

  const raw = typeof candidate.toJSON === "function" ? candidate.toJSON() : candidate
  const value = typeof raw?.candidate === "string" ? raw.candidate : ""

  if (!value || value.startsWith("TODO_NATIVE_ICE_CANDIDATE")) {
    return null
  }

  return {
    candidate: value,
    sdpMid: raw?.sdpMid ?? null,
    sdpMLineIndex: raw?.sdpMLineIndex ?? null,
    usernameFragment: raw?.usernameFragment ?? null,
  }
}

function attachRemoteTrack(event: { streams?: StreamLike[]; track?: any }) {
  const moduleRef = getModuleRef()
  const remoteFromEvent = event.streams?.[0] ?? null

  if (remoteFromEvent) {
    internals.remoteStream = remoteFromEvent
    syncStreamURLs()
    pushDiagnostic(`Remote stream atașat: audio=${currentNativeSession?.remoteAudioTracks ?? 0}, video=${currentNativeSession?.remoteVideoTracks ?? 0}`)
    return
  }

  if (event.track) {
    const remote = ensureRemoteStream(moduleRef)
    if (remote && typeof remote.addTrack === "function") {
      const existingTracks = remote.getTracks?.() ?? []
      const alreadyAdded = existingTracks.some((track: any) => track.id && track.id === event.track.id)
      if (!alreadyAdded) remote.addTrack(event.track)
      syncStreamURLs()
      pushDiagnostic(`Track remote atașat manual: ${event.track.kind || "unknown"}`)
      return
    }
  }

  pushDiagnostic(event.track ? "Track remote primit, dar nu poate fi atașat" : "Track remote fără stream")
}

async function ensureReceiveTransceivers(pc: PeerConnectionLike) {
  if (internals.transceiversReady) return
  internals.transceiversReady = true

  try {
    const anyPc = pc as any
    if (typeof anyPc.addTransceiver === "function") {
      anyPc.addTransceiver("audio", { direction: "sendrecv" })
      if (currentNativeSession?.callType === "video") {
        anyPc.addTransceiver("video", { direction: "sendrecv" })
      }
      pushDiagnostic("Transceivere sendrecv configurate")
    }
  } catch (error) {
    pushDiagnostic("Transceivere indisponibile; continui cu addTrack")
  }
}

async function ensurePeerConnection() {
  const moduleRef = getModuleRef()
  if (!moduleRef) return null
  if (internals.peerConnection) return internals.peerConnection

  const pc = new moduleRef.RTCPeerConnection({ iceServers: currentIceServers })

  pc.onconnectionstatechange = () => {
    const nextState = (pc.connectionState || "unknown") as WebRtcConnectionStateLike
    setConnectionState(nextState)
    pushDiagnostic(`Connection state: ${nextState}`)
  }

  pc.oniceconnectionstatechange = () => {
    pushDiagnostic(`ICE state: ${pc.iceConnectionState || "unknown"}`)
  }

  pc.onicegatheringstatechange = () => {
    pushDiagnostic(`ICE gathering: ${pc.iceGatheringState || "unknown"}`)
  }

  pc.onicecandidate = async (event: any) => {
    const normalized = normalizeIceCandidate(event?.candidate)
    if (!normalized) return

    pushDiagnostic("ICE local generat")

    try {
      await localIceCandidateHandler?.(normalized)
    } catch (error) {
      pushDiagnostic("Trimiterea ICE local a eșuat")
      console.warn("Local ICE handler failed", error)
    }
  }

  pc.ontrack = attachRemoteTrack
  ;(pc as any).onaddstream = (event: { stream?: StreamLike }) => {
    if (event.stream) {
      internals.remoteStream = event.stream
      syncStreamURLs()
      pushDiagnostic(`Remote stream onaddstream: audio=${currentNativeSession?.remoteAudioTracks ?? 0}, video=${currentNativeSession?.remoteVideoTracks ?? 0}`)
    }
  }

  internals.peerConnection = pc
  await ensureReceiveTransceivers(pc)
  return pc
}

export function setNativeIceCandidateHandler(
  handler: ((candidate: IceCandidateLike) => Promise<void> | void) | null
) {
  localIceCandidateHandler = handler
}

export async function createNativeWebRtcSession(callType: CallType, iceServers: IceServerConfig[] = []) {
  const runtime = getWebRtcRuntimeState()
  currentIceServers = iceServers

  currentNativeSession = {
    callType,
    localURL: null,
    remoteURL: null,
    localReady: false,
    remoteReady: false,
    connectionState: "new",
    diagnostics: [],
    iceServers,
    microphoneEnabled: true,
    cameraEnabled: callType === "video",
    speakerEnabled: callType === "video",
    remoteAudioTracks: 0,
    remoteVideoTracks: 0,
  }

  internals = {
    moduleRef: getModuleRef(),
    peerConnection: null,
    localStream: null,
    remoteStream: null,
    transceiversReady: false,
  }

  startNativeAudioRoute(callType)
  pushDiagnostic(`Audio route pornit pentru ${callType}`)
  pushDiagnostic(`Sesiune nativă creată pentru ${callType}`)
  pushDiagnostic(runtime.note)
  pushDiagnostic(`ICE servers configurate: ${iceServers.length}`)

  if (runtime.readyForNativeStreams) {
    await ensurePeerConnection()
  }

  return currentNativeSession
}

export function getNativeWebRtcSession() {
  syncStreamURLs()
  return currentNativeSession
}

export async function prepareNativeLocalStream() {
  const moduleRef = getModuleRef()
  const pc = await ensurePeerConnection()

  if (!currentNativeSession) return
  if (!moduleRef || !pc) {
    currentNativeSession.localReady = true
    pushDiagnostic("Local stream fallback marcat ca pregătit")
    return
  }

  if (internals.localStream) {
    syncStreamURLs()
    pushDiagnostic("Local stream reutilizat")
    return
  }

  const localStream = await moduleRef.mediaDevices.getUserMedia({
    audio: true,
    video:
      currentNativeSession.callType === "video"
        ? { facingMode: "user" }
        : false,
  })

  internals.localStream = localStream
  localStream.getAudioTracks?.().forEach((track: any) => {
    track.enabled = currentNativeSession?.microphoneEnabled ?? true
  })
  localStream.getVideoTracks?.().forEach((track: any) => {
    track.enabled = currentNativeSession?.cameraEnabled ?? true
  })
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
  syncStreamURLs()
  pushDiagnostic(`Local stream nativ pregătit: audio=${localStream.getAudioTracks?.().length ?? 0}, video=${localStream.getVideoTracks?.().length ?? 0}`)
}

export async function markNativeRemoteStreamReady() {
  if (currentNativeSession) {
    currentNativeSession.remoteReady = Boolean(currentNativeSession.remoteURL || internals.remoteStream)
    syncStreamURLs()
    pushDiagnostic("Remote stream marcat ca pregătit")
  }
}

export function setNativeMicrophoneEnabled(enabled: boolean) {
  if (currentNativeSession) currentNativeSession.microphoneEnabled = enabled
  internals.localStream?.getAudioTracks?.().forEach((track: any) => {
    track.enabled = enabled
  })
  pushDiagnostic(enabled ? "Microfon activ" : "Microfon dezactivat")
  return enabled
}

export function setNativeCameraEnabled(enabled: boolean) {
  if (currentNativeSession) currentNativeSession.cameraEnabled = enabled
  internals.localStream?.getVideoTracks?.().forEach((track: any) => {
    track.enabled = enabled
  })
  pushDiagnostic(enabled ? "Camera activă" : "Camera dezactivată")
  return enabled
}

export async function switchNativeCamera() {
  const videoTrack = internals.localStream?.getVideoTracks?.()[0] as any
  if (videoTrack && typeof videoTrack._switchCamera === "function") {
    await videoTrack._switchCamera()
    pushDiagnostic("Camera schimbată")
    return true
  }

  pushDiagnostic("Schimbarea camerei indisponibilă")
  return false
}

export function setNativeSpeakerEnabled(enabled: boolean) {
  if (currentNativeSession) currentNativeSession.speakerEnabled = enabled
  const routed = setNativeSpeakerphone(enabled)
  pushDiagnostic(enabled ? `Speaker activ${routed ? "" : " (fallback)"}` : `Speaker dezactivat${routed ? "" : " (fallback)"}`)
  return enabled
}

export async function createNativeOffer(): Promise<SessionDescriptionLike> {
  const pc = await ensurePeerConnection()
  if (!pc) {
    pushDiagnostic("Offer placeholder generat")
    return {
      type: "offer",
      sdp: WEBRTC_PLACEHOLDERS.offer,
    }
  }

  await ensureReceiveTransceivers(pc)
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: currentNativeSession?.callType === "video",
  })
  await pc.setLocalDescription(offer)
  pushDiagnostic("Offer nativ generat")
  return {
    type: "offer",
    sdp: offer.sdp || WEBRTC_PLACEHOLDERS.offer,
  }
}

export async function createNativeAnswer(): Promise<SessionDescriptionLike> {
  const pc = await ensurePeerConnection()
  if (!pc) {
    pushDiagnostic("Answer placeholder generat")
    return {
      type: "answer",
      sdp: WEBRTC_PLACEHOLDERS.answer,
    }
  }

  await ensureReceiveTransceivers(pc)
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  pushDiagnostic("Answer nativ generat")
  return {
    type: "answer",
    sdp: answer.sdp || WEBRTC_PLACEHOLDERS.answer,
  }
}

export async function applyNativeRemoteDescription(description: SessionDescriptionLike) {
  const moduleRef = getModuleRef()
  const pc = await ensurePeerConnection()

  if (!moduleRef || !pc) {
    pushDiagnostic("Remote description primită în fallback adapter")
    return
  }

  await pc.setRemoteDescription(new moduleRef.RTCSessionDescription(description))
  syncStreamURLs()
  pushDiagnostic(`Remote description aplicată: ${description.type}`)
}

export async function addNativeIceCandidate(candidate: IceCandidateLike) {
  const normalized = normalizeIceCandidate(candidate)
  if (!normalized) {
    pushDiagnostic("ICE placeholder ignorat")
    return
  }

  const moduleRef = getModuleRef()
  const pc = await ensurePeerConnection()

  if (!moduleRef || !pc) {
    pushDiagnostic("ICE candidate primit în fallback adapter")
    return
  }

  await pc.addIceCandidate(new moduleRef.RTCIceCandidate(normalized))
  syncStreamURLs()
  pushDiagnostic("ICE candidate aplicat")
}

export async function closeNativeWebRtcSession() {
  try {
    internals.localStream?.getTracks().forEach((track) => track.stop())
    internals.remoteStream?.getTracks().forEach((track) => track.stop())
    internals.peerConnection?.close()
    stopNativeAudioRoute()
  } catch {
    // ignore cleanup failures
  }

  currentNativeSession = null
  currentIceServers = []
  localIceCandidateHandler = null
  internals = {
    moduleRef: null,
    peerConnection: null,
    localStream: null,
    remoteStream: null,
    transceiversReady: false,
  }
}
