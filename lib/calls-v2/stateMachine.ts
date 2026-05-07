import {
  initialVivosCallState,
  VivosCallRuntimeState,
  VivosCallStatus,
  VivosCallType,
} from "@/lib/calls-v2/types"

function addDiagnostic(state: VivosCallRuntimeState, message: string): VivosCallRuntimeState {
  return {
    ...state,
    diagnostics: [...state.diagnostics.slice(-15), message],
  }
}

export function createIdleCallState(): VivosCallRuntimeState {
  return { ...initialVivosCallState }
}

export function startOutgoingCallState(args: {
  callSessionId: string
  conversationId: string
  remoteUserId: string
  callType: VivosCallType
}): VivosCallRuntimeState {
  return addDiagnostic(
    {
      ...initialVivosCallState,
      status: "ringing_outgoing",
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      remoteUserId: args.remoteUserId,
      callType: args.callType,
      cameraEnabled: args.callType === "video",
      speakerEnabled: args.callType === "video",
    },
    `Apel trimis: ${args.callType}`
  )
}

export function startIncomingCallState(args: {
  callSessionId: string
  conversationId: string
  remoteUserId: string
  callType: VivosCallType
}): VivosCallRuntimeState {
  return addDiagnostic(
    {
      ...initialVivosCallState,
      status: "ringing_incoming",
      callSessionId: args.callSessionId,
      conversationId: args.conversationId,
      remoteUserId: args.remoteUserId,
      callType: args.callType,
      cameraEnabled: args.callType === "video",
      speakerEnabled: args.callType === "video",
    },
    `Apel primit: ${args.callType}`
  )
}

export function setCallStatus(
  state: VivosCallRuntimeState,
  status: VivosCallStatus,
  diagnostic?: string
): VivosCallRuntimeState {
  const next = {
    ...state,
    status,
  }

  return diagnostic ? addDiagnostic(next, diagnostic) : next
}

export function setLocalStreamState(
  state: VivosCallRuntimeState,
  localStreamURL: string | null
): VivosCallRuntimeState {
  return addDiagnostic(
    {
      ...state,
      localStreamReady: Boolean(localStreamURL),
      localStreamURL,
    },
    localStreamURL ? "Local stream pregătit" : "Local stream indisponibil"
  )
}

export function setRemoteStreamState(
  state: VivosCallRuntimeState,
  remoteStreamURL: string | null
): VivosCallRuntimeState {
  return addDiagnostic(
    {
      ...state,
      remoteStreamReady: Boolean(remoteStreamURL),
      remoteStreamURL,
    },
    remoteStreamURL ? "Remote stream primit" : "Remote stream indisponibil"
  )
}

export function setMicrophoneState(
  state: VivosCallRuntimeState,
  enabled: boolean
): VivosCallRuntimeState {
  return addDiagnostic(
    {
      ...state,
      microphoneEnabled: enabled,
    },
    enabled ? "Microfon activ" : "Microfon oprit"
  )
}

export function setCameraState(
  state: VivosCallRuntimeState,
  enabled: boolean
): VivosCallRuntimeState {
  return addDiagnostic(
    {
      ...state,
      cameraEnabled: enabled,
    },
    enabled ? "Camera activă" : "Camera oprită"
  )
}

export function setSpeakerState(
  state: VivosCallRuntimeState,
  enabled: boolean
): VivosCallRuntimeState {
  return addDiagnostic(
    {
      ...state,
      speakerEnabled: enabled,
    },
    enabled ? "Speaker activ" : "Speaker oprit"
  )
}

export function failCallState(
  state: VivosCallRuntimeState,
  reason: string
): VivosCallRuntimeState {
  return addDiagnostic(
    {
      ...state,
      status: "failed",
    },
    reason
  )
}

export function endCallState(
  state: VivosCallRuntimeState,
  reason = "Apel închis"
): VivosCallRuntimeState {
  return addDiagnostic(
    {
      ...state,
      status: "ended",
      localStreamReady: false,
      remoteStreamReady: false,
      localStreamURL: null,
      remoteStreamURL: null,
    },
    reason
  )
}
