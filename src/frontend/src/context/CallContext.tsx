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
      playTone(440, 480, 0.4);
      currentTimeout = setTimeout(() => {
        if (stopped) return;
        playTone(440, 480, 0.4);
        currentTimeout = setTimeout(() => {
          currentTimeout = setTimeout(ringLoop, 2000);
        }, 600);
      }, 600);
    } else {
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
  timeoutMs = 5000,
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
  const durationSecsRef = useRef(0);

  // Store the full incoming call session when detected (includes sdpOffer)
  const incomingCallSessionRef = useRef<{
    id: string;
    callType: CallType;
    callerUsername: string;
    sdpOffer: string | null;
  } | null>(null);

  // Remote audio element ref
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
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);
  useEffect(() => {
    durationSecsRef.current = callDurationSeconds;
  }, [callDurationSeconds]);

  // Wire remote stream to audio element (for voice calls)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // ── Audio helpers ─────────────────────────────────────────────────────
  const startRingtone = useCallback((isIncoming: boolean) => {
    try {
      if (audioCtxRef.current) audioCtxRef.current.close();
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      stopRingtoneRef.current = createRingtone(ctx, isIncoming);
    } catch {
      /* ignore */
    }
  }, []);

  const stopRingtone = useCallback(() => {
    try {
      stopRingtoneRef.current?.();
      stopRingtoneRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    } catch {
      /* ignore */
    }
  }, []);

  // ── WebRTC peer connection ─────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        // Open relay TURN servers for when STUN fails (symmetric NAT)
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
      iceCandidatePoolSize: 10,
    });

    pcRef.current = pc;

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      setRemoteStream(stream);
    };

    // No trickle ICE uploads — we use bundled SDP with full ICE candidates
    pc.onicecandidate = null;

    return pc;
  }, []);

  const getMedia = useCallback(async (type: CallType) => {
    const constraints =
      type === CallType.video
        ? {
            audio: true,
            video: {
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
          }
        : { audio: true, video: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    localStreamRef.current = stream;
    return stream;
  }, []);

  const cleanupCall = useCallback(() => {
    const stream = localStreamRef.current;
    for (const t of stream?.getTracks() ?? []) t.stop();
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    incomingCallSessionRef.current = null;

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    stopRingtone();

    setCallDurationSeconds(0);
    setIsMuted(false);
    setIsSpeakerOn(true);
  }, [stopRingtone]);

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
        /* ignore */
      }
    },
    [actor, sessionToken],
  );

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    setCallDurationSeconds(0);
    durationSecsRef.current = 0;
    durationIntervalRef.current = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

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

        // Only show incoming call if the SDP offer is already available
        const sdpOffer = session.sdpOffer ?? null;
        if (!sdpOffer) return; // Offer not yet sent by caller — wait

        incomingCallSessionRef.current = {
          id: session.id,
          callType: session.callType,
          callerUsername: session.callerUsername,
          sdpOffer,
        };

        setCallId(session.id);
        setCallType(session.callType);
        setPartnerUsername(session.callerUsername);
        setCallPhase("incoming_ringing");
        startRingtone(true);

        // Browser push notification when tab is hidden
        if (
          document.hidden &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(
              `Incoming ${session.callType === CallType.video ? "video" : "voice"} call from ${session.callerUsername}`,
              {
                body: "Tap to open Myapp and answer",
                icon: "/favicon.ico",
              },
            );
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    };

    const interval = setInterval(checkIncoming, 1500);
    return () => clearInterval(interval);
  }, [actor, currentUser, sessionToken, startRingtone]);

  // ── Poll for call status changes (outgoing_ringing / active) ──────────
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
          const answer = JSON.parse(session.sdpAnswer as string);
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(answer),
          );
        } catch (e) {
          console.error("Failed to set remote description:", e);
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
        if (type && partner)
          await sendCallStatusMessage(partner, type, 0, "declined");
        cleanupCall();
        setCallPhase("idle");
        setCallId(null);
        setPartnerUsername(null);
        setCallType(null);
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
        cleanupCall();
        setCallPhase("idle");
        setCallId(null);
        setPartnerUsername(null);
        setCallType(null);
        stopPolling();
        return;
      }
    } catch {
      /* ignore */
    }
  }, [
    actor,
    sessionToken,
    stopRingtone,
    startDurationTimer,
    sendCallStatusMessage,
    cleanupCall,
    stopPolling,
    currentUser,
  ]);

  // ── Phase-driven polling ──────────────────────────────────────────────
  useEffect(() => {
    if (callPhase === "outgoing_ringing" || callPhase === "active") {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(pollCallSession, 1000);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [callPhase, stopPolling, pollCallSession]);

  // ── initiateCall ──────────────────────────────────────────────────────
  const initiateCall = useCallback(
    async (calleeUsername: string, type: CallType) => {
      if (!actor || !currentUser) return;

      try {
        // 1. Get media first
        const stream = await getMedia(type);

        // 2. Create PeerConnection
        const pc = createPeerConnection();

        // 3. Add local tracks
        for (const track of stream.getTracks()) pc.addTrack(track, stream);

        // 4. Create offer and set local description
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === CallType.video,
        });
        await pc.setLocalDescription(offer);

        // 5. Wait for ICE gathering (max 5s — uses TURN as fallback)
        await waitForIceGathering(pc, 5000);

        // 6. Get bundled SDP (includes all gathered ICE candidates)
        const finalSdp = pc.localDescription;
        if (!finalSdp)
          throw new Error("No local description after ICE gathering");

        // 7. Create call session on backend
        const newCallId = await actor.initiateCallWithToken(
          calleeUsername,
          type,
          sessionToken,
        );
        callIdRef.current = newCallId;

        // 8. Send the bundled SDP offer (callee will only see the call after this)
        await actor.sendSdpOfferWithToken(
          newCallId,
          JSON.stringify(finalSdp),
          sessionToken,
        );

        // 9. Update state — callee can now see the call and answer
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

    const incoming = incomingCallSessionRef.current;
    if (!incoming?.sdpOffer) {
      console.error("answerCall: no SDP offer available");
      return;
    }

    stopRingtone();

    const type = incoming.callType ?? CallType.voice;

    try {
      // 1. Get media
      const stream = await getMedia(type);

      // 2. Create PeerConnection
      const pc = createPeerConnection();

      // 3. Add local tracks
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      // 4. Set remote description from the stored SDP offer
      const offerSdp = JSON.parse(incoming.sdpOffer);
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // 5. Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 6. Wait for ICE gathering (max 5s)
      await waitForIceGathering(pc, 5000);

      // 7. Get bundled answer SDP
      const finalAnswer = pc.localDescription;
      if (!finalAnswer)
        throw new Error("No local description after answer ICE gathering");

      // 8. Mark call as accepted on backend
      await actor.answerCallWithToken(callId, sessionToken);

      // 9. Send bundled answer SDP
      await actor.sendSdpAnswerWithToken(
        callId,
        JSON.stringify(finalAnswer),
        sessionToken,
      );

      // 10. Activate call
      setCallPhase("active");
      startDurationTimer();
    } catch (err) {
      console.error("answerCall error:", err);
      // Try to decline gracefully on error
      try {
        await actor.declineCallWithToken(callId, sessionToken);
      } catch {
        /* ignore */
      }
      cleanupCall();
      setCallPhase("idle");
      setCallId(null);
      setPartnerUsername(null);
      setCallType(null);
    }
  }, [
    actor,
    callId,
    sessionToken,
    stopRingtone,
    getMedia,
    createPeerConnection,
    startDurationTimer,
    cleanupCall,
  ]);

  // ── declineCall ───────────────────────────────────────────────────────
  const declineCall = useCallback(async () => {
    if (!actor || !callId) return;

    const type = callTypeRef.current ?? CallType.voice;
    const partner = partnerUsernameRef.current;

    try {
      await actor.declineCallWithToken(callId, sessionToken);
      if (partner) await sendCallStatusMessage(partner, type, 0, "missed");
    } catch {
      /* ignore */
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
      if (partner)
        await sendCallStatusMessage(partner, type, duration, "ended");
    } catch {
      /* ignore */
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
      {/* Hidden audio element for remote audio playback (voice calls) */}
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
