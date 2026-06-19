import {
  clearGlobalIncomingVivosCall,
  getGlobalIncomingVivosCall,
} from "@/lib/calls-v2/globalIncomingCallState"
import { stopVivosCallV2Ringtone } from "@/lib/calls-v2/callRingtone"

type ActiveVivosCallRuntimeState = {
  conversationId: string | null
  callSessionId: string | null
}

const state: ActiveVivosCallRuntimeState = {
  conversationId: null,
  callSessionId: null,
}

function clean(value?: string | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function clearMatchingGlobalIncomingCall(args: {
  conversationId?: string | null
  callSessionId?: string | null
}) {
  const conversationId = clean(args.conversationId)
  const callSessionId = clean(args.callSessionId)
  const current = getGlobalIncomingVivosCall()

  if (!current) return

  const sameCall = callSessionId && current.callSessionId === callSessionId
  const sameConversation = conversationId && current.conversationId === conversationId

  if (!sameCall && !sameConversation) return

  clearGlobalIncomingVivosCall(sameCall ? callSessionId : undefined)
  void stopVivosCallV2Ringtone(sameCall ? callSessionId : undefined)
}

export function setActiveVivosCallConversation(conversationId?: string | null) {
  state.conversationId = clean(conversationId)
  clearMatchingGlobalIncomingCall({ conversationId: state.conversationId })
}

export function setActiveVivosCallSession(args: {
  conversationId?: string | null
  callSessionId?: string | null
}) {
  state.conversationId = clean(args.conversationId)
  state.callSessionId = clean(args.callSessionId)
  clearMatchingGlobalIncomingCall({ conversationId: state.conversationId, callSessionId: state.callSessionId })
}

export function clearActiveVivosCallSession(callSessionId?: string | null) {
  const targetCallSessionId = clean(callSessionId)

  if (targetCallSessionId && state.callSessionId && state.callSessionId !== targetCallSessionId) {
    return
  }

  state.callSessionId = null
}

export function clearActiveVivosCallConversation(conversationId?: string | null) {
  const targetConversationId = clean(conversationId)

  if (targetConversationId && state.conversationId && state.conversationId !== targetConversationId) {
    return
  }

  state.conversationId = null
  state.callSessionId = null
}

export function hasActiveVivosCallSession() {
  return Boolean(state.callSessionId)
}

export function isActiveVivosCallConversation(conversationId?: string | null) {
  const targetConversationId = clean(conversationId)
  return Boolean(targetConversationId && state.conversationId === targetConversationId)
}

export function isSameActiveVivosCall(args: {
  conversationId?: string | null
  callSessionId?: string | null
}) {
  const targetConversationId = clean(args.conversationId)
  const targetCallSessionId = clean(args.callSessionId)

  if (!targetConversationId || state.conversationId !== targetConversationId) return false
  if (!targetCallSessionId) return true

  return !state.callSessionId || state.callSessionId === targetCallSessionId
}

export function shouldBlockIncomingVivosCall(args: {
  conversationId?: string | null
  callSessionId?: string | null
}) {
  const targetConversationId = clean(args.conversationId)
  const targetCallSessionId = clean(args.callSessionId)

  if (!state.callSessionId) return false
  if (!targetConversationId) return true
  if (state.conversationId && state.conversationId !== targetConversationId) return true
  if (!targetCallSessionId) return true

  return state.callSessionId !== targetCallSessionId
}

export function getActiveVivosCallRuntimeSnapshot() {
  return { ...state }
}
