import type { CallState } from "./call-types.js";

const TRANSITIONS: Record<CallState, CallState[]> = {
  idle: ["outgoing", "incoming"],
  outgoing: ["connecting", "ended"],
  incoming: ["connecting", "ended"],
  connecting: ["connected", "ended"],
  connected: ["ended"],
  ended: ["idle"],
};

export function canTransition(from: CallState, to: CallState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transitionCallState(current: CallState, next: CallState): CallState {
  if (!canTransition(current, next)) {
    throw new Error(`Invalid call transition: ${current} -> ${next}`);
  }
  return next;
}