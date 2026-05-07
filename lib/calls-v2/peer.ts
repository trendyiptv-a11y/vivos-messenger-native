import { VivosCallType } from "@/lib/calls-v2/types"
import { getLocalStream } from "@/lib/calls-v2/media"
import { IceServerConfig, loadTurnCredentials } from "@/lib/calls/turn"

type ReactNativeWebRtcModule = typeof import("react-native-webrtc")
type PeerConnectionLike = InstanceType<ReactNativeWebRtcModule["RTCPeerConnection"]>
type MediaStreamLike = import("react-native-webrtc").MediaStream

export type VivosSessionDescription = {
  type: "offer" | "answer"
  sdp: string
}

export type VivosIceCandidate = {
  candidate: string
  sdpMid?: string | null
  sdpMLineIndex?: number | null
  usernameFragment?: string | null
}

export type VivosPeerSnapshot = {
  localDescription: VivosSessionDescription | null
  remoteDescription: VivosSessionDescription | null
  localCandidates: VivosIceCandidate[]
  remoteCandidates: VivosIceCandidate[]
  remoteStreamURL: string | null
  remoteAudioTracks: number
  remoteVideoTracks: number
  connectionState: string
  iceConnectionState: string
  diagnostics: string[]
}

let moduleRef: ReactNativeWebRtcModule | null = null
let peerConnection: PeerConnectionLike | null = null
let remoteStream: MediaStreamLike | null = null
let localDescription: VivosSessionDescription | null = null
let remoteDescription: VivosSessionDescription | null = null
let localCandidates: VivosIceCandidate[] = []
let remoteCandidates: VivosIceCandidate[] = []
let diagnostics: string[] = []
let localIceHandler: ((candidate: VivosIceCandidate) => void | Promise<void>) | null = null

function pushDiagnostic(message: string) {
  diagnostics = [...diagnostics.slice(-20), message]
}

function getModuleRef(): ReactNativeWebRtcModule | null {
  if (moduleRef) return moduleRef

  try {
    moduleRef = require("react-native-webrtc") as ReactNativeWebRtcModule
    return moduleRef
  } catch (error) {
    console.warn("react-native-webrtc unavailable", error)
    pushDiagnostic("react-native-webrtc indisponibil")
    return null
  }
}

function normalizeCandidate(candidate: any): VivosIceCandidate | null {
  if (!candidate) return null

  const raw = typeof candidate.toJSON === "function" ? candidate.toJSON() : candidate
  const value = typeof raw?.candidate === "string" ? raw.candidate : ""

  if (!value) return null

  return {
    candidate: value,
    sdpMid: raw?.sdpMid ?? null,
    sdpMLineIndex: raw?.sdpMLineIndex ?? null,
    usernameFragment: raw?.usernameFragment ?? null,
  }
}

function normalizeDescription(description: any): VivosSessionDescription {
  const raw = typeof description?.toJSON === "function" ? description.toJSON() : description

  return {
    type: raw.type === "answer" ? "answer" : "offer",
    sdp: String(raw.sdp || ""),
  }
}

function ensureRemoteStream(webrtc: ReactNativeWebRtcModule | null) {
  if (remoteStream) return remoteStream
  if (!webrtc?.MediaStream) return null

  remoteStream = new webrtc.MediaStream()
  return remoteStream
}

function attachRemoteTrack(event: { streams?: MediaStreamLike[]; track?: any }) {
  const webrtc = getModuleRef()
  const streamFromEvent = event.streams?.[0] ?? null

  if (streamFromEvent) {
    remoteStream = streamFromEvent
    pushDiagnostic(`Remote stream primit: audio=${getRemoteAudioTracks()}, video=${getRemoteVideoTracks()}`)
    return
  }

  if (event.track) {
    const stream = ensureRemoteStream(webrtc)

    if (stream && typeof stream.addTrack === "function") {
      const existingTracks = stream.getTracks?.() ?? []
      const alreadyAdded = existingTracks.some((track: any) => track.id && track.id === event.track.id)

      if (!alreadyAdded) {
        stream.addTrack(event.track)
      }

      pushDiagnostic(`Remote track atașat manual: ${event.track.kind || "unknown"}`)
      return
    }
  }

  pushDiagnostic("Remote track primit, dar nu a putut fi atașat")
}

async function addLocalTracksToPeer(pc: PeerConnectionLike) {
  const stream = getLocalStream()

  if (!stream) {
    pushDiagnostic("Nu există local stream pentru peer")
    return
  }

  const tracks = stream.getTracks?.() ?? []

  tracks.forEach((track: any) => {
    pc.addTrack(track, stream)
  })

  pushDiagnostic(
    `Track-uri locale adăugate: audio=${stream.getAudioTracks?.().length ?? 0}, video=${
      stream.getVideoTracks?.().length ?? 0
    }`
  )
}

async function ensureReceiveTransceivers(pc: PeerConnectionLike, callType: VivosCallType) {
  // V2 simplificat:
  // Nu adăugăm transceivere manuale în React Native.
  // Folosim doar addTrack(localTrack, localStream).
  // Asta evită dublarea m-line-urilor în SDP și pierderea track-ului Android -> Web.
  pushDiagnostic(`Transceivere manuale omise pentru ${callType}`)
}

export function setVivosLocalIceHandler(handler: ((candidate: VivosIceCandidate) => void | Promise<void>) | null) {
  localIceHandler = handler
}

export async function createVivosPeerConnection(callType: VivosCallType) {
  await closeVivosPeerConnection()

  const webrtc = getModuleRef()

  if (!webrtc) {
    throw new Error("react-native-webrtc nu este disponibil în acest build.")
  }

  const { iceServers } = await loadTurnCredentials().catch(() => ({ iceServers: [] as IceServerConfig[] }))

  const pc = new webrtc.RTCPeerConnection({
    iceServers,
  })

  peerConnection = pc
  remoteStream = null
  localDescription = null
  remoteDescription = null
  localCandidates = []
  remoteCandidates = []
  diagnostics = []

  pc.onconnectionstatechange = () => {
    pushDiagnostic(`Connection state: ${pc.connectionState || "unknown"}`)
  }

  pc.oniceconnectionstatechange = () => {
    pushDiagnostic(`ICE state: ${pc.iceConnectionState || "unknown"}`)
  }

  pc.onicegatheringstatechange = () => {
    pushDiagnostic(`ICE gathering: ${pc.iceGatheringState || "unknown"}`)
  }

  pc.onicecandidate = async (event: any) => {
    const normalized = normalizeCandidate(event?.candidate)
    if (!normalized) return

    localCandidates = [...localCandidates, normalized]
    pushDiagnostic("ICE local generat")

    try {
      await localIceHandler?.(normalized)
    } catch (error) {
      console.warn("Local ICE handler failed", error)
      pushDiagnostic("Trimiterea ICE local a eșuat")
    }
  }

  pc.ontrack = attachRemoteTrack

  ;(pc as any).onaddstream = (event: { stream?: MediaStreamLike }) => {
    if (event.stream) {
      remoteStream = event.stream
      pushDiagnostic(`Remote stream onaddstream: audio=${getRemoteAudioTracks()}, video=${getRemoteVideoTracks()}`)
    }
  }

  await ensureReceiveTransceivers(pc, callType)
  await addLocalTracksToPeer(pc)

  pushDiagnostic(`Peer creat pentru ${callType}`)
  pushDiagnostic(`ICE servers: ${iceServers.length}`)

  return pc
}

export function getVivosPeerConnection() {
  return peerConnection
}

export async function createVivosOffer(): Promise<VivosSessionDescription> {
  if (!peerConnection) {
    throw new Error("Peer connection lipsește pentru offer.")
  }

  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  })

  await peerConnection.setLocalDescription(offer)

  localDescription = normalizeDescription(offer)
  pushDiagnostic("Offer creat și setat local")

  return localDescription
}

export async function createVivosAnswer(): Promise<VivosSessionDescription> {
  if (!peerConnection) {
    throw new Error("Peer connection lipsește pentru answer.")
  }

  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)

  localDescription = normalizeDescription(answer)
  pushDiagnostic("Answer creat și setat local")

  return localDescription
}

export async function applyVivosRemoteDescription(description: VivosSessionDescription) {
  const webrtc = getModuleRef()

  if (!webrtc || !peerConnection) {
    throw new Error("Peer connection lipsește pentru remote description.")
  }

  await peerConnection.setRemoteDescription(new webrtc.RTCSessionDescription(description))

  remoteDescription = description
  pushDiagnostic(`Remote description aplicată: ${description.type}`)
}

export async function addVivosRemoteIceCandidate(candidate: VivosIceCandidate) {
  const webrtc = getModuleRef()

  if (!webrtc || !peerConnection) {
    throw new Error("Peer connection lipsește pentru ICE.")
  }

  const normalized = normalizeCandidate(candidate)

  if (!normalized) {
    pushDiagnostic("ICE remote invalid ignorat")
    return
  }

  await peerConnection.addIceCandidate(new webrtc.RTCIceCandidate(normalized))

  remoteCandidates = [...remoteCandidates, normalized]
  pushDiagnostic("ICE remote adăugat")
}

export function getRemoteStream() {
  return remoteStream
}

export function getRemoteStreamURL() {
  return remoteStream?.toURL?.() ?? null
}

export function getRemoteAudioTracks() {
  return remoteStream?.getAudioTracks?.().length ?? 0
}

export function getRemoteVideoTracks() {
  return remoteStream?.getVideoTracks?.().length ?? 0
}

export function getVivosPeerSnapshot(): VivosPeerSnapshot {
  return {
    localDescription,
    remoteDescription,
    localCandidates: [...localCandidates],
    remoteCandidates: [...remoteCandidates],
    remoteStreamURL: getRemoteStreamURL(),
    remoteAudioTracks: getRemoteAudioTracks(),
    remoteVideoTracks: getRemoteVideoTracks(),
    connectionState: peerConnection?.connectionState || "none",
    iceConnectionState: peerConnection?.iceConnectionState || "none",
    diagnostics: [...diagnostics],
  }
}

export async function closeVivosPeerConnection() {
  try {
    peerConnection?.close()
  } catch (error) {
    console.warn("closeVivosPeerConnection failed", error)
  }

  peerConnection = null
  remoteStream = null
  localDescription = null
  remoteDescription = null
  localCandidates = []
  remoteCandidates = []
  diagnostics = []
  localIceHandler = null
}
