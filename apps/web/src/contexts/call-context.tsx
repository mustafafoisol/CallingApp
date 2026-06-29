"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CallRecord, CallStatus } from "@calling-app/core";
import { createClient } from "@/lib/supabase/client";
import { registerActiveCallEnder } from "@/lib/call/active-call-registry";
import { CallSession } from "@/lib/call/call-session";
import { MediaPermissionError } from "@/lib/call/media";
import { startOutgoingCall } from "@/lib/call/outgoing";
import {
  acceptCall as acceptCallRow,
  endCall as endCallRow,
  markCallBusy,
  markCallMissed,
  rejectCall as rejectCallRow,
} from "@/lib/call/signaling";
import { REALTIME_GRACE_MS, RING_TIMEOUT_MS } from "@/lib/call/timeouts";
import type { Contact } from "@/lib/contacts/load-contacts";

export type CallUiState =
  | "idle"
  | "incoming"
  | "outgoing"
  | "connecting"
  | "connected"
  | "ended";

type CallContextValue = {
  uiState: CallUiState;
  activeCall: CallRecord | null;
  remoteName: string;
  remoteAvatarUrl: string | null;
  muted: boolean;
  error: string | null;
  statusMessage: string | null;
  connectedAt: number | null;
  startCall: (conversationId: string, calleeId: string, remoteName: string, avatarUrl?: string | null) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

const TERMINAL: CallStatus[] = ["ended", "missed", "rejected", "busy"];

function terminalMessage(status: CallStatus): string {
  if (status === "rejected") return "Declined";
  if (status === "missed") return "No answer";
  if (status === "busy") return "Line busy";
  return "Call ended";
}

export function CallProvider({
  currentUserId,
  contacts,
  children,
}: {
  currentUserId: string;
  contacts: Contact[];
  children: ReactNode;
}) {
  const [uiState, setUiState] = useState<CallUiState>("idle");
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [remoteName, setRemoteName] = useState("");
  const [remoteAvatarUrl, setRemoteAvatarUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);

  const sessionRef = useRef<CallSession | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uiStateRef = useRef(uiState);
  const activeCallRef = useRef(activeCall);
  const endCallRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    uiStateRef.current = uiState;
  }, [uiState]);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

  const cleanupSession = useCallback(() => {
    sessionRef.current = null;
    setMuted(false);
  }, []);

  const resetCall = useCallback(() => {
    clearRingTimer();
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    cleanupSession();
    setActiveCall(null);
    setRemoteName("");
    setRemoteAvatarUrl(null);
    setError(null);
    setConnectedAt(null);
    setUiState("idle");
    setStatusMessage(null);
  }, [cleanupSession, clearRingTimer]);

  const showEnded = useCallback((message: string) => {
    setStatusMessage(message);
    setUiState("ended");
    window.setTimeout(resetCall, 1200);
  }, [resetCall]);

  const resolveRemote = useCallback(
    (call: CallRecord) => {
      const remoteId =
        call.caller_id === currentUserId ? call.callee_id : call.caller_id;
      const contact = contacts.find((row) => row.friend.id === remoteId);
      return {
        name: contact?.friend.display_name ?? "Friend",
        avatarUrl: contact?.friend.avatar_url ?? null,
      };
    },
    [contacts, currentUserId],
  );

  const handleTerminal = useCallback(
    (call: CallRecord) => {
      if (activeCallRef.current?.id !== call.id) return;
      if (uiStateRef.current === "ended" || uiStateRef.current === "idle") return;
      void sessionRef.current?.hangUp().catch(() => undefined);
      showEnded(terminalMessage(call.status));
    },
    [showEnded],
  );

  const startCallerSession = useCallback(
    async (call: CallRecord) => {
      setUiState("connecting");
      const supabase = createClient();
      const session = new CallSession(supabase, currentUserId, call.id, {
        onConnected: () => {
          setConnectedAt(Date.now());
          setUiState("connected");
        },
        onError: (err) => setError(err.message),
      });
      sessionRef.current = session;
      try {
        await session.startAsCaller();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not connect call.");
        await endCallRow(supabase, call.id, currentUserId).catch(() => undefined);
        resetCall();
      }
    },
    [currentUserId, resetCall],
  );

  const startCalleeSession = useCallback(
    async (call: CallRecord) => {
      setUiState("connecting");
      const supabase = createClient();
      const session = new CallSession(supabase, currentUserId, call.id, {
        onConnected: () => {
          setConnectedAt(Date.now());
          setUiState("connected");
        },
        onError: (err) => setError(err.message),
      });
      sessionRef.current = session;
      try {
        await session.startAsCallee();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not answer call.");
        await rejectCallRow(supabase, call.id, currentUserId).catch(() => undefined);
        resetCall();
      }
    },
    [currentUserId, resetCall],
  );

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      channel = supabase
        .channel(`calls:${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "calls",
            filter: `callee_id=eq.${currentUserId}`,
          },
          (payload) => {
            const call = payload.new as CallRecord;
            if (call.status !== "ringing" || call.caller_id === currentUserId) return;
            if (uiStateRef.current !== "idle") {
              void markCallBusy(supabase, call.id, currentUserId);
              return;
            }
            const remote = resolveRemote(call);
            setActiveCall(call);
            setRemoteName(remote.name);
            setRemoteAvatarUrl(remote.avatarUrl);
            setUiState("incoming");
            setError(null);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "calls" },
          (payload) => {
            const call = payload.new as CallRecord;
            if (![call.caller_id, call.callee_id].includes(currentUserId)) return;
            setActiveCall((prev) => (prev?.id === call.id ? call : prev));

            if (TERMINAL.includes(call.status)) {
              handleTerminal(call);
              return;
            }

            if (
              call.caller_id === currentUserId &&
              call.status === "accepted" &&
              uiStateRef.current === "outgoing" &&
              !sessionRef.current
            ) {
              void startCallerSession(call);
            }
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (uiStateRef.current === "connected" || uiStateRef.current === "connecting") {
              if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
              graceTimerRef.current = setTimeout(() => {
                setError("Connection lost. Ending call.");
                void endCallRef.current();
              }, REALTIME_GRACE_MS);
            }
          } else if (status === "SUBSCRIBED" && graceTimerRef.current) {
            clearTimeout(graceTimerRef.current);
            graceTimerRef.current = null;
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
      clearRingTimer();
      cleanupSession();
    };
  }, [
    cleanupSession,
    clearRingTimer,
    currentUserId,
    handleTerminal,
    resolveRemote,
    startCallerSession,
  ]);

  const startCall = useCallback(
    async (
      conversationId: string,
      calleeId: string,
      name: string,
      avatarUrl?: string | null,
    ) => {
      if (uiStateRef.current !== "idle") return;
      setError(null);
      setRemoteName(name);
      setRemoteAvatarUrl(avatarUrl ?? null);
      setUiState("outgoing");

      try {
        const supabase = createClient();
        const call = await startOutgoingCall(
          supabase,
          currentUserId,
          conversationId,
          calleeId,
        );
        setActiveCall(call);

        ringTimerRef.current = setTimeout(() => {
          if (activeCallRef.current?.id !== call.id) return;
          if (uiStateRef.current !== "outgoing") return;
          void markCallMissed(supabase, call.id, currentUserId).finally(() =>
            showEnded("No answer"),
          );
        }, RING_TIMEOUT_MS);
      } catch (err) {
        const message =
          err instanceof MediaPermissionError
            ? "Microphone permission denied"
            : err instanceof Error
              ? err.message
              : "Could not start call.";
        setError(message);
        resetCall();
      }
    },
    [currentUserId, resetCall, showEnded],
  );

  const acceptCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call || uiStateRef.current !== "incoming") return;
    clearRingTimer();
    setError(null);
    try {
      const supabase = createClient();
      const updated = await acceptCallRow(supabase, call.id, currentUserId);
      setActiveCall(updated);
      await startCalleeSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer call.");
      resetCall();
    }
  }, [clearRingTimer, currentUserId, resetCall, startCalleeSession]);

  const rejectCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    clearRingTimer();
    await rejectCallRow(createClient(), call.id, currentUserId);
    resetCall();
  }, [clearRingTimer, currentUserId, resetCall]);

  const endCall = useCallback(async () => {
    clearRingTimer();
    const call = activeCallRef.current;
    if (sessionRef.current) {
      await sessionRef.current.hangUp();
      showEnded("Call ended");
      return;
    }
    if (call) {
      await endCallRow(createClient(), call.id, currentUserId).catch(() => undefined);
      resetCall();
    }
  }, [clearRingTimer, currentUserId, resetCall, showEnded]);

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setMuted((prev) => {
      const next = !prev;
      if (next) session.mute();
      else session.unmute();
      return next;
    });
  }, []);

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  useEffect(() => {
    return registerActiveCallEnder(() => {
      void endCallRef.current();
    });
  }, []);

  useEffect(() => {
    const onUnload = () => {
      const call = activeCallRef.current;
      if (!call) return;
      void endCallRow(createClient(), call.id, currentUserId);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [currentUserId]);

  return (
    <CallContext.Provider
      value={{
        uiState,
        activeCall,
        remoteName,
        remoteAvatarUrl,
        muted,
        error,
        statusMessage,
        connectedAt,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const value = useContext(CallContext);
  if (!value) throw new Error("useCall must be used within CallProvider");
  return value;
}