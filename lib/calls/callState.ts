import { IncomingCall } from "@/types/call"

export type IncomingCallAction = "open" | "accept" | "reject"

let currentIncomingCall: IncomingCall | null = null
let currentIncomingCallAction: IncomingCallAction = "open"

export function setIncomingCallState(call: IncomingCall | null, action: IncomingCallAction = "open") {
  currentIncomingCall = call
  currentIncomingCallAction = action
}

export function getIncomingCallState() {
  return currentIncomingCall
}

export function getIncomingCallAction() {
  return currentIncomingCallAction
}

export function clearIncomingCallState() {
  currentIncomingCall = null
  currentIncomingCallAction = "open"
}
