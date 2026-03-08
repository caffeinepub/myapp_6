import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CallStatus, CallType } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useApp } from "./AppContext";

export type CallPhase =
  | "idle"
  | "outgoing_ringing"
  | "incoming_ringing"
  | "active"
  | "ended";

interface CallContextValue {
  callId: string | null;
  callType: CallType | null;
  callPhase: CallPhase;
  partnerUsername: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isSpeakerOn: boolean;
  isMuted: boolean;
  callDurationSeconds: number;
  initiateCall: (calleeUsername: string, type: CallType) => Promise<void>;
  answerCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleSpeaker: () => void;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

// ── Web Audio API helpers ──────────────────────────────────────────────────
function createRingtone(
  audioCtx: AudioContext,
  isIncoming: boolean,
): () => void {
  let stopped = false;
  let currentTimeout: ReturnType<typeof setTimeout> | null = null;

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = isIncoming ? 0.6 : 0.3;
  gainNode.connect(audioCtx.destination);

  function playTone(freq1: number, freq2: number, duration: number) {
    if (stopped) return;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    osc1.frequency.value = freq1;
    osc2.frequency.value = freq2;
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    const t = audioCtx.currentTime;
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + duration);
    osc2.stop(t + duration);
  }

  function ringLoop() {
    if (stopped) return;
    if (isIncoming) {
      // Two-tone UK style ring: 400ms on, 200ms off, 400ms on, 2s off
      playTone(440, 480, 0.4);
      currentTimeout = setTimeout(() => {
        if (stopped) return;
        playTone(440, 480, 0.4);
        currentTimeout = setTimeout(() => {
          currentTimeout = setTimeout(ringLoop, 2000);
        }, 600);
      }, 600);
    } else {
      // Caller ringback: softer beep
      playTone(440, 440, 0.35);
      currentTimeout = setTimeout(ringLoop, 2000);
    }
  }

  ringLoop();

  return () => {
    stopped = true;
    if (currentTimeout) clearTimeout(currentTimeout);
    gainNode.disconnect();
  };
}

// ── ICE gathering complete promise ─────────────────────────────────────────
function waitForIceGathering(
  pc: RTCPeerConnection,
  timeoutMs = 3000,
): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, timeoutMs);
    const onStateChange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        pc.removeEventListener("icegatheringstatechange", onStateChange);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", onStateChange);
  });
}

// ── ICE candidate tracker ──────────────────────────────────────────────────
function useCallICETracker() {
  const trackerRef = useRef<{
    callerIdx: number;
    calleeIdx: number;
  }>({ callerIdx: 0, calleeIdx: 0 });

  const reset = () => {
    trackerRef.current = { callerIdx: 0, calleeIdx: 0 };
  };

  return { trackerRef, reset };
}

// ── Provider ──────────────────────────────────────────────────────────────
export function CallProvider({ children }: { children: ReactNode }) {
  const { actor } = useActor();
  const { currentUser, sessionToken } = useApp();

  const [callId, setCallId] = useState<string | null>(null);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  const [partnerUsername, setPartnerUsername] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Use a ref to track localStream to avoid stale closures in cleanupCall
  const localStreamRef = useRef<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const callPhaseRef = useRef<CallPhase>("idle");
  const callIdRef = useRef<string | null>(null);
  const partnerUsernameRef = useRef<string | null>(null);
  const callTypeRef = useRef<CallType | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { trackerRef, reset: resetICETracker } = useCallICETracker();

  // Ref to buffer ICE candidates arriving before setRemoteDescription
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const remoteDescSetRef = useRef(false);

  // Store incoming call SDP offer when detected
  const incomingCallSdpOfferRef = useRef<string | null>(null);

  // Remote audio element ref — needed so browser plays remote audio
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    callPhaseRef.current = callPhase;
  }, [callPhase]);
  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);
  useEffect(() => {
    partnerUsernameRef.current = partnerUsername;
  }, [partnerUsername]);
  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  // Keep localStreamRef in sync
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Wire remote stream to audio element
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {
        // autoplay may be blocked — user interaction should unblock it
      });
    }
  }, [remoteStream]);

  // ── Audio helpers ─────────────────────────────────────────────────────
  const startRingtone = useCallback((isIncoming: boolean) => {
    try {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const stop = createRingtone(ctx, isIncoming);
      stopRingtoneRef.current = stop;
    } catch {
      // ignore audio errors silently
    }
  }, []);

  const stopRingtone = useCallback(() => {
    try {
      stopRingtoneRef.current?.();
      stopRingtoneRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    } catch {
      // ignore
    }
  }, []);

  // ── Apply buffered ICE candidates ──────────────────────────────────────
  const applyPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !remoteDescSetRef.current) return;
    const pending = pendingRemoteCandidatesRef.current.splice(0);
    for (const c of pending) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        // ignore
      }
    }
  }, []);

  // ── WebRTC helpers ────────────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }
    remoteDescSetRef.current = false;
    pendingRemoteCandidatesRef.current = [];

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
      ],
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      setRemoteStream(stream);
    };

    // Upload trickle candidates to backend as fallback
    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;
      const cid = callIdRef.current;
      if (!cid || !actor) return;
      try {
        await actor.addIceCandidateWithToken(
          cid,
          JSON.stringify(event.candidate.toJSON()),
          sessionToken,
        );
      } catch {
        // ignore
      }
    };

    return pc;
  }, [actor, sessionToken]);

  const getMedia = useCallback(async (type: CallType) => {
    const constraints =
      type === CallType.video
        ? { audio: true, video: { facingMode: "user" } }
        : { audio: true, video: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    localStreamRef.current = stream;
    return stream;
  }, []);

  const cleanupCall = useCallback(() => {
    // Use ref to avoid stale closure
    const stream = localStreamRef.current;
    for (const t of stream?.getTracks() ?? []) t.stop();
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);

    // Disconnect remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    remoteDescSetRef.current = false;
    pendingRemoteCandidatesRef.current = [];
    incomingCallSdpOfferRef.current = null;

    // Stop timers
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    stopRingtone();
    resetICETracker();

    setCallDurationSeconds(0);
    setIsMuted(false);
    setIsSpeakerOn(true);
  }, [stopRingtone, resetICETracker]);

  const sendCallStatusMessage = useCallback(
    async (
      partnerUser: string,
      type: CallType,
      durationSecs: number,
      status: "ended" | "missed" | "declined",
    ) => {
      if (!actor) return;
      let text = "";
      if (status === "ended") {
        const mins = Math.floor(durationSecs / 60);
        const secs = durationSecs % 60;
        const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        text =
          type === CallType.video
            ? `📹 Video call ended · ${durationStr}`
            : `📞 Call ended · ${durationStr}`;
      } else if (status === "missed") {
        text =
          type === CallType.video ? "📹 Missed video call" : "📞 Missed call";
      } else {
        text =
          type === CallType.video
            ? "📹 Video call declined"
            : "📞 Call declined";
      }
      try {
        await actor.sendMessageWithToken(partnerUser, text, sessionToken);
      } catch {
        // ignore
      }
    },
    [actor, sessionToken],
  );

  // ── Duration timer ────────────────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    setCallDurationSeconds(0);
    durationIntervalRef.current = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  // ── Polling ───────────────────────────────────────────────────────────
  const startPolling = useCallback(
    (intervalMs: number, fn: () => Promise<void>) => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(fn, intervalMs);
    },
    [],
  );

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // ── Poll for incoming calls (when idle) ───────────────────────────────
  useEffect(() => {
    if (!actor || !currentUser) return;

    const checkIncoming = async () => {
      if (callPhaseRef.current !== "idle") return;
      try {
        const session = await actor.getIncomingCallWithToken(sessionToken);
        if (!session) return;
        if (session.status !== CallStatus.ringing) return;
        if (callPhaseRef.current !== "idle") return;

        // Store the SDP offer for use when answering
        incomingCallSdpOfferRef.current = session.sdpOffer ?? null;

        setCallId(session.id);
        setCallType(session.callType);
        setPartnerUsername(session.callerUsername);
        setCallPhase("incoming_ringing");
        startRingtone(true);

        // Fire browser notification when tab is hidden
        if (
          (document.hidden || Notification.permission === "granted") &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(
              `Incoming ${session.callType} call from ${session.callerUsername}`,
              {
                body: "Tap to open Myapp and answer",
                icon: "/favicon.ico",
              },
            );
          } catch {
            // ignore notification errors
          }
        }
      } catch {
        // ignore polling errors
      }
    };

    const interval = setInterval(checkIncoming, 2000);
    return () => clearInterval(interval);
  }, [actor, currentUser, sessionToken, startRingtone]);

  // ── Poll for call status changes (outgoing_ringing / active) ──────────
  const durationSecsRef = useRef(0);
  useEffect(() => {
    durationSecsRef.current = callDurationSeconds;
  }, [callDurationSeconds]);

  const pollCallSession = useCallback(async () => {
    const cid = callIdRef.current;
    const phase = callPhaseRef.current;
    const type = callTypeRef.current;
    const partner = partnerUsernameRef.current;

    if (!cid || !actor || (phase !== "outgoing_ringing" && phase !== "active"))
      return;

    try {
      const session = await actor.getCallSessionWithToken(cid, sessionToken);
      if (!session) return;

      // ── Caller: answer received ──────────────────────────────────────
      if (
        phase === "outgoing_ringing" &&
        session.status === CallStatus.accepted &&
        session.sdpAnswer &&
        pcRef.current &&
        !pcRef.current.remoteDescription
      ) {
        stopRingtone();
        try {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(session.sdpAnswer)),
          );
          remoteDescSetRef.current = true;
          await applyPendingCandidates();
        } catch {
          // ignore SDP errors
        }
        setCallPhase("active");
        startDurationTimer();
      }

      // ── Call declined ────────────────────────────────────────────────
      if (
        phase === "outgoing_ringing" &&
        session.status === CallStatus.declined
      ) {
        stopRingtone();
        if (type && partner) {
          await sendCallStatusMessage(partner, type, 0, "declined");
        }
        setCallPhase("ended");
        cleanupCall();
        setTimeout(() => {
          setCallPhase("idle");
          setCallId(null);
          setPartnerUsername(null);
          setCallType(null);
        }, 2000);
        stopPolling();
        return;
      }

      // ── Call ended (by remote) ────────────────────────────────────────
      if (
        (phase === "active" || phase === "outgoing_ringing") &&
        session.status === CallStatus.ended
      ) {
        const wasCaller = session.callerUsername === currentUser?.username;
        stopRingtone();
        if (type && partner && !wasCaller) {
          await sendCallStatusMessage(
            partner,
            type,
            durationSecsRef.current,
            "ended",
          );
        }
        setCallPhase("ended");
        cleanupCall();
        setTimeout(() => {
          setCallPhase("idle");
          setCallId(null);
          setPartnerUsername(null);
          setCallType(null);
        }, 2000);
        stopPolling();
        return;
      }

      // ── Exchange trickle ICE candidates ──────────────────────────────
      if (pcRef.current) {
        const isCallerPolling =
          session.callerUsername === currentUser?.username;
        const remoteCandidates = isCallerPolling
          ? session.calleeIceCandidates
          : session.callerIceCandidates;
        const currentIdx = isCallerPolling
          ? trackerRef.current.calleeIdx
          : trackerRef.current.callerIdx;

        const newCandidates = remoteCandidates.slice(currentIdx);
        for (const candidateStr of newCandidates) {
          try {
            const candidateObj = JSON.parse(candidateStr);
            const candidate = new RTCIceCandidate(candidateObj);
            if (remoteDescSetRef.current && pcRef.current) {
              await pcRef.current.addIceCandidate(candidate);
            } else {
              // Buffer for later
              pendingRemoteCandidatesRef.current.push(candidate);
            }
          } catch {
            // ignore
          }
        }

        if (isCallerPolling) {
          trackerRef.current.calleeIdx = remoteCandidates.length;
        } else {
          trackerRef.current.callerIdx = remoteCandidates.length;
        }
      }
    } catch {
      // ignore polling errors
    }
  }, [
    actor,
    sessionToken,
    stopRingtone,
    startDurationTimer,
    sendCallStatusMessage,
    cleanupCall,
    stopPolling,
    applyPendingCandidates,
    trackerRef,
    currentUser,
  ]);

  // ── Phase-driven polling ──────────────────────────────────────────────
  useEffect(() => {
    if (callPhase === "outgoing_ringing" || callPhase === "active") {
      startPolling(1500, pollCallSession);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [callPhase, startPolling, stopPolling, pollCallSession]);

  // ── initiateCall ──────────────────────────────────────────────────────
  const initiateCall = useCallback(
    async (calleeUsername: string, type: CallType) => {
      if (!actor || !currentUser) return;

      try {
        // 1. Get media
        const stream = await getMedia(type);

        // 2. Create PeerConnection
        const pc = createPeerConnection();

        // 3. Add local tracks
        for (const track of stream.getTracks()) pc.addTrack(track, stream);

        // 4. Create offer and set local description
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 5. Wait for ICE gathering to complete (max 3s)
        await waitForIceGathering(pc, 3000);

        // 6. Get the final SDP (includes all ICE candidates)
        const finalSdp = pc.localDescription;

        // 7. Initiate call on backend
        const newCallId = await actor.initiateCallWithToken(
          calleeUsername,
          type,
          sessionToken,
        );

        callIdRef.current = newCallId;

        // 8. Send the bundled offer (with candidates) to backend
        await actor.sendSdpOfferWithToken(
          newCallId,
          JSON.stringify(finalSdp),
          sessionToken,
        );

        // 9. Update state
        setCallId(newCallId);
        setCallType(type);
        setPartnerUsername(calleeUsername);
        setCallPhase("outgoing_ringing");
        startRingtone(false);
      } catch (err) {
        cleanupCall();
        throw err;
      }
    },
    [
      actor,
      currentUser,
      sessionToken,
      getMedia,
      createPeerConnection,
      startRingtone,
      cleanupCall,
    ],
  );

  // ── answerCall ────────────────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    if (!actor || !callId) return;

    try {
      // 1. Mark as accepted on backend first
      await actor.answerCallWithToken(callId, sessionToken);

      // 2. Stop ringtone
      stopRingtone();

      const type = callTypeRef.current ?? CallType.voice;

      // 3. Get media
      const stream = await getMedia(type);

      // 4. Create PeerConnection
      const pc = createPeerConnection();

      // 5. Add local tracks
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      // 6. Set remote description from stored SDP offer
      const sdpOffer = incomingCallSdpOfferRef.current;
      if (sdpOffer) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(sdpOffer)),
        );
        remoteDescSetRef.current = true;
        // Apply any buffered candidates
        await applyPendingCandidates();
      }

      // 7. Create answer and set local description
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 8. Wait for ICE gathering to complete (max 3s)
      await waitForIceGathering(pc, 3000);

      // 9. Send bundled answer to backend
      const finalAnswer = pc.localDescription;
      await actor.sendSdpAnswerWithToken(
        callId,
        JSON.stringify(finalAnswer),
        sessionToken,
      );

      // 10. Activate call
      setCallPhase("active");
      startDurationTimer();
    } catch {
      // ignore errors gracefully
    }
  }, [
    actor,
    callId,
    sessionToken,
    stopRingtone,
    getMedia,
    createPeerConnection,
    applyPendingCandidates,
    startDurationTimer,
  ]);

  // ── declineCall ───────────────────────────────────────────────────────
  const declineCall = useCallback(async () => {
    if (!actor || !callId) return;

    const type = callTypeRef.current ?? CallType.voice;
    const partner = partnerUsernameRef.current;

    try {
      await actor.declineCallWithToken(callId, sessionToken);
      if (partner) {
        await sendCallStatusMessage(partner, type, 0, "missed");
      }
    } catch {
      // ignore
    }

    stopRingtone();
    cleanupCall();
    setCallPhase("idle");
    setCallId(null);
    setPartnerUsername(null);
    setCallType(null);
  }, [
    actor,
    callId,
    sessionToken,
    sendCallStatusMessage,
    stopRingtone,
    cleanupCall,
  ]);

  // ── endCall ───────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    if (!actor || !callId) return;

    const type = callTypeRef.current ?? CallType.voice;
    const partner = partnerUsernameRef.current;
    const duration = durationSecsRef.current;

    try {
      await actor.endCallWithToken(callId, sessionToken);
      if (partner) {
        await sendCallStatusMessage(partner, type, duration, "ended");
      }
    } catch {
      // ignore
    }

    stopRingtone();
    cleanupCall();
    setCallPhase("idle");
    setCallId(null);
    setPartnerUsername(null);
    setCallType(null);
  }, [
    actor,
    callId,
    sessionToken,
    sendCallStatusMessage,
    stopRingtone,
    cleanupCall,
  ]);

  // ── toggleSpeaker ─────────────────────────────────────────────────────
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  // ── toggleMute ────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const stream = localStreamRef.current;
      if (stream) {
        for (const t of stream.getAudioTracks()) {
          t.enabled = !next;
        }
      }
      return next;
    });
  }, []);

  return (
    <CallContext.Provider
      value={{
        callId,
        callType,
        callPhase,
        partnerUsername,
        localStream,
        remoteStream,
        isSpeakerOn,
        isMuted,
        callDurationSeconds,
        initiateCall,
        answerCall,
        declineCall,
        endCall,
        toggleSpeaker,
        toggleMute,
      }}
    >
      {/* Hidden audio element for remote audio playback */}
      {/* biome-ignore lint/a11y/useMediaCaption: remote call audio, no captions needed */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
