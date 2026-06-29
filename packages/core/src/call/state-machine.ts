import type { CallRole, CallStatus } from "../types.js";

const TERMINAL_STATUSES: ReadonlySet<CallStatus> = new Set([
  "ended",
  "missed",
  "rejected",
  "busy",
]);

/** Valid status transitions per role. Terminal states have no outgoing edges. */
const TRANSITIONS: Record<CallStatus, Partial<Record<CallRole, CallStatus[]>>> = {
  ringing: {
    caller: ["ended", "missed"],
    callee: ["accepted", "rejected", "missed", "busy"],
  },
  accepted: {
    caller: ["ended"],
    callee: ["ended"],
  },
  ended: {},
  missed: {},
  rejected: {},
  busy: {},
};

export function isTerminal(status: CallStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function getCallRole(
  callerId: string,
  calleeId: string,
  userId: string,
): CallRole | null {
  if (userId === callerId) return "caller";
  if (userId === calleeId) return "callee";
  return null;
}

export function canTransition(
  from: CallStatus,
  to: CallStatus,
  role: CallRole,
): boolean {
  if (from === to) return true;
  if (isTerminal(from)) return false;

  const allowed = TRANSITIONS[from][role];
  return allowed?.includes(to) ?? false;
}

export function assertTransition(
  from: CallStatus,
  to: CallStatus,
  role: CallRole,
): void {
  if (!canTransition(from, to, role)) {
    throw new Error(
      `Invalid call transition: ${from} → ${to} as ${role}`,
    );
  }
}