import { IncomingCall } from "@/types/call"

let currentIncomingCall: IncomingCall | null = null

export function setIncomingCallState(call: IncomingCall | null) {
  currentIncomingCall = call
}

export function getIncomingCallState() {
  return currentIncomingCall
}

export function clearIncomingCallState() {
  currentIncomingCall = null
}
