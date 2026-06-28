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
import type { CallRow, CallState } from "@calling-app/core";
import { createClient } from "@/lib/supabase/client";
import {
  acceptVoiceCall,
  createVoiceCall,
  updateCallStatus,
} from "@/lib/calls/call-db";
import { fetchIceServers } from "@/lib/calls/ice-servers";
import { AudioPeerSession } from "@/lib/calls/peer-session";
import type { Contact } from "@/lib/contacts/load-contacts";

interface CallContextValue {
  uiState: CallState;
  activeCall: CallRow | null;
  remoteName: string;
  muted: boolean;
  error: string | null;
  startCall: (conversationId: string, calleeId: string, remoteName: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

const RING_TIMEOUT_MS = 45_000;

function isTerminal(status: CallRow["status"]) {
  return status === "ended" || status === "rejected" || status === "missed";
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
  const [uiState, setUiState] = useState<CallState>("idle");
  const [activeCall, setActiveCall] = useState<CallRow | null>(null);
  const [remoteName, setRemoteName] = useState("");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<AudioPeerSession | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uiStateRef = useRef(uiState);
  const activeCallRef = useRef(activeCall);

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

  const cleanupPeer = useCallback(() => {
    peerRef.current?.hangUp();
    peerRef.current = null;
    setMuted(false);
  }, []);

  const resetCall = useCallback(() => {
    clearRingTimer();
    cleanupPeer();
    setActiveCall(null);
    setRemoteName("");
    setError(null);
    setUiState("idle");
  }, [cleanupPeer, clearRingTimer]);

  const resolveRemoteName = useCallback(
    (call: CallRow) => {
      const remoteId =
        call.caller_id === currentUserId ? call.callee_id : call.caller_id;
      const contact = contacts.find((row) => row.friend.id === remoteId);
      return contact?.friend.display_name ?? "Friend";
    },
    [contacts, currentUserId],
  );

  const handleTerminal = useCallback(
    async (call: CallRow) => {
      if (activeCallRef.current?.id !== call.id) return;
      resetCall();
    },
    [resetCall],
  );

  const onPeerConnection = useCallback((state: RTCPeerConnectionState) => {
    if (state === "connected") setUiState("connected");
    if (state === "failed" || state === "disconnected") {
      setError("Call connection lost.");
    }
  }, []);

  const applyAnswerIfReady = useCallback(
    async (call: CallRow) => {
      if (call.caller_id !== currentUserId || !call.answer_sdp) return;
      if (!peerRef.current) return;
      if (uiStateRef.current === "connected") return;

      try {
        clearRingTimer();
        setUiState("connecting");
        await peerRef.current.applyAnswer(call.answer_sdp);
        setUiState("connected");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not connect call.");
        await updateCallStatus(createClient(), call.id, "ended");
        resetCall();
      }
    },
    [clearRingTimer, currentUserId, resetCall],
  );

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session) return;

      channel = supabase
        .channel(`calls:${currentUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "calls" },
          (payload) => {
            const call = payload.new as CallRow;
            if (call.callee_id !== currentUserId || call.status !== "ringing") {
              return;
            }
            if (uiStateRef.current !== "idle") return;

            setActiveCall(call);
            setRemoteName(resolveRemoteName(call));
            setUiState("incoming");
            setError(null);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "calls" },
          (payload) => {
            const call = payload.new as CallRow;
            if (![call.caller_id, call.callee_id].includes(currentUserId)) return;

            setActiveCall((prev) => (prev?.id === call.id ? call : prev));

            if (isTerminal(call.status)) {
              void handleTerminal(call);
              return;
            }

            void applyAnswerIfReady(call);
          },
        )
        .subscribe();
    }

    void subscribe();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
      clearRingTimer();
      cleanupPeer();
    };
  }, [
    applyAnswerIfReady,
    cleanupPeer,
    clearRingTimer,
    currentUserId,
    handleTerminal,
    resolveRemoteName,
  ]);

  const startCall = useCallback(
    async (conversationId: string, calleeId: string, name: string) => {
      if (uiStateRef.current !== "idle") return;

      setError(null);
      setRemoteName(name);
      setUiState("outgoing");

      try {
        const iceServers = await fetchIceServers();
        const peer = new AudioPeerSession(onPeerConnection);
        peerRef.current = peer;
        const offerSdp = await peer.startCaller(iceServers);

        const supabase = createClient();
        const call = await createVoiceCall(
          supabase,
          conversationId,
          currentUserId,
          calleeId,
          offerSdp,
        );
        setActiveCall(call);
        setUiState("outgoing");

        ringTimerRef.current = setTimeout(() => {
          if (activeCallRef.current?.id !== call.id) return;
          if (uiStateRef.current !== "outgoing") return;
          void updateCallStatus(supabase, call.id, "missed").finally(resetCall);
        }, RING_TIMEOUT_MS);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start call.");
        resetCall();
      }
    },
    [currentUserId, onPeerConnection, resetCall],
  );

  const acceptCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call?.offer_sdp || uiStateRef.current !== "incoming") return;

    clearRingTimer();
    setUiState("connecting");
    setError(null);

    try {
      const iceServers = await fetchIceServers();
      const peer = new AudioPeerSession(onPeerConnection);
      peerRef.current = peer;
      const answerSdp = await peer.acceptCallee(iceServers, call.offer_sdp);

      const supabase = createClient();
      const updated = await acceptVoiceCall(supabase, call.id, answerSdp);
      setActiveCall(updated);
      setUiState("connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer call.");
      if (call) {
        await updateCallStatus(createClient(), call.id, "rejected");
      }
      resetCall();
    }
  }, [clearRingTimer, onPeerConnection, resetCall]);

  const rejectCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    clearRingTimer();
    await updateCallStatus(createClient(), call.id, "rejected");
    resetCall();
  }, [clearRingTimer, resetCall]);

  const endCall = useCallback(async () => {
    const call = activeCallRef.current;
    clearRingTimer();
    if (call) {
      await updateCallStatus(createClient(), call.id, "ended");
    }
    resetCall();
  }, [clearRingTimer, resetCall]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      peerRef.current?.setMuted(next);
      return next;
    });
  }, []);

  return (
    <CallContext.Provider
      value={{
        uiState,
        activeCall,
        remoteName,
        muted,
        error,
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