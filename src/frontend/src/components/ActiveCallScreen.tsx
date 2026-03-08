import {
  Mic,
  MicOff,
  PhoneOff,
  UserPlus,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CallType } from "../backend.d";
import { useApp } from "../context/AppContext";

interface ActiveCallScreenProps {
  callType: CallType;
  partnerUsername: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDurationSeconds: number;
  onEnd: () => void;
  onToggleSpeaker: () => void;
  onToggleMute: () => void;
  isSpeakerOn: boolean;
  isMuted: boolean;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Video element with stream attachment ──────────────────────────────────
function VideoEl({
  stream,
  muted,
  className,
  style,
}: {
  stream: MediaStream | null;
  muted: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
      style={style}
    />
  );
}

// ── Control button ─────────────────────────────────────────────────────────
function ControlBtn({
  icon: Icon,
  label,
  onClick,
  active,
  danger,
  ocid,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  ocid: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        data-ocid={ocid}
        onClick={onClick}
        aria-label={label}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all"
        style={
          danger
            ? {
                background:
                  "linear-gradient(135deg, oklch(0.52 0.22 22) 0%, oklch(0.45 0.2 15) 100%)",
                boxShadow: "0 4px 18px oklch(0.5 0.22 22 / 0.5)",
              }
            : active
              ? {
                  background: "oklch(0.28 0.05 155 / 0.9)",
                  border: "1.5px solid oklch(0.45 0.15 145 / 0.5)",
                  boxShadow: "0 0 0 1px oklch(0.45 0.15 145 / 0.2)",
                }
              : {
                  background: "oklch(0.22 0.04 155 / 0.8)",
                  border: "1.5px solid oklch(0.35 0.08 155 / 0.4)",
                }
        }
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.92 }}
      >
        <Icon
          className="w-5 h-5 sm:w-6 sm:h-6"
          style={{
            color: danger
              ? "white"
              : active
                ? "oklch(0.72 0.18 145)"
                : "oklch(0.85 0.03 100)",
          }}
        />
      </motion.button>
      <span
        className="text-[10px] font-medium"
        style={{ color: "oklch(0.55 0.04 155)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Voice Mode ────────────────────────────────────────────────────────────
function VoiceCallUI({
  partnerUsername,
  callDurationSeconds,
  onEnd,
  onToggleSpeaker,
  onToggleMute,
  isSpeakerOn,
  isMuted,
}: Omit<ActiveCallScreenProps, "callType" | "localStream" | "remoteStream">) {
  const { currentUser } = useApp();
  const myUsername = currentUser?.username ?? "You";

  return (
    <div
      data-ocid="active_call.panel"
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.1 0.07 155) 0%, oklch(0.07 0.05 155) 100%)",
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.35 0.15 145 / 0.12) 0%, transparent 70%)",
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-safe-top pt-6 pb-4">
        <span
          className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
          style={{
            background: "oklch(0.35 0.12 155 / 0.3)",
            color: "oklch(0.72 0.18 145)",
            border: "1px solid oklch(0.5 0.16 145 / 0.3)",
          }}
        >
          Active
        </span>
        <motion.span
          className="text-sm font-mono tabular-nums"
          style={{ color: "oklch(0.72 0.12 145)" }}
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          {formatDuration(callDurationSeconds)}
        </motion.span>
      </div>

      {/* Participants */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {/* Partner avatar */}
        <div className="flex flex-col items-center gap-3">
          <motion.div
            className="relative w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.5 0.2 145) 0%, oklch(0.38 0.16 160) 100%)",
              boxShadow:
                "0 0 0 3px oklch(0.35 0.1 155), 0 8px 32px oklch(0.45 0.2 145 / 0.4)",
              color: "oklch(0.97 0.01 100)",
              fontFamily: "Bricolage Grotesque, sans-serif",
            }}
            animate={{
              boxShadow: [
                "0 0 0 3px oklch(0.35 0.1 155), 0 8px 32px oklch(0.45 0.2 145 / 0.4)",
                "0 0 0 3px oklch(0.45 0.16 145), 0 8px 40px oklch(0.5 0.22 145 / 0.55)",
                "0 0 0 3px oklch(0.35 0.1 155), 0 8px 32px oklch(0.45 0.2 145 / 0.4)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            {partnerUsername.charAt(0).toUpperCase()}
          </motion.div>
          <p
            className="text-xl font-bold"
            style={{
              color: "oklch(0.96 0.01 100)",
              fontFamily: "Bricolage Grotesque, sans-serif",
            }}
          >
            {partnerUsername}
          </p>
        </div>

        {/* You avatar */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold"
            style={{
              background: "oklch(0.25 0.05 155 / 0.7)",
              border: "1.5px solid oklch(0.4 0.1 155 / 0.4)",
              color: "oklch(0.72 0.1 145)",
              fontFamily: "Bricolage Grotesque, sans-serif",
            }}
          >
            {myUsername.charAt(0).toUpperCase()}
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "oklch(0.6 0.05 155)" }}
          >
            You
          </p>
        </div>
      </div>

      {/* Control bar */}
      <div className="relative z-10 pb-safe-bottom pb-10 px-6">
        <div
          className="rounded-2xl px-5 py-4"
          style={{
            background: "oklch(0.14 0.05 155 / 0.85)",
            border: "1px solid oklch(0.3 0.08 155 / 0.4)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 -8px 32px oklch(0 0 0 / 0.3)",
          }}
        >
          <div className="flex items-center justify-between">
            {/* End call (left, wide) */}
            <motion.button
              data-ocid="active_call.end_button"
              onClick={onEnd}
              aria-label="End call"
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.52 0.22 22) 0%, oklch(0.45 0.2 15) 100%)",
                boxShadow: "0 4px 20px oklch(0.5 0.22 22 / 0.5)",
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
            >
              <PhoneOff className="w-4 h-4" />
              End
            </motion.button>

            {/* Right controls */}
            <div className="flex items-center gap-4">
              <ControlBtn
                icon={isMuted ? MicOff : Mic}
                label={isMuted ? "Unmute" : "Mute"}
                onClick={onToggleMute}
                active={isMuted}
                ocid="active_call.mute_toggle"
              />
              <ControlBtn
                icon={isSpeakerOn ? Volume2 : VolumeX}
                label="Speaker"
                onClick={onToggleSpeaker}
                active={isSpeakerOn}
                ocid="active_call.speaker_toggle"
              />
              <ControlBtn
                icon={UserPlus}
                label="Add"
                onClick={() => toast.info("Feature coming soon")}
                ocid="active_call.add_button"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Video Mode ─────────────────────────────────────────────────────────────
function VideoCallUI({
  partnerUsername,
  localStream,
  remoteStream,
  callDurationSeconds,
  onEnd,
  onToggleSpeaker,
  onToggleMute,
  isSpeakerOn,
  isMuted,
}: Omit<ActiveCallScreenProps, "callType">) {
  const [isCameraOff, setIsCameraOff] = useState(false);

  const toggleCamera = () => {
    if (localStream) {
      for (const t of localStream.getVideoTracks()) {
        t.enabled = !t.enabled;
      }
      setIsCameraOff((prev) => !prev);
    }
  };

  return (
    <div
      data-ocid="active_call.panel"
      className="fixed inset-0 z-[9999] bg-black"
    >
      {/* Remote video or connecting placeholder */}
      {remoteStream ? (
        <VideoEl
          stream={remoteStream}
          muted={false}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex flex-col items-center justify-center"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.1 0.07 155) 0%, oklch(0.07 0.05 155) 100%)",
          }}
        >
          <motion.div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-4"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.5 0.2 145) 0%, oklch(0.38 0.16 160) 100%)",
              color: "oklch(0.97 0.01 100)",
              fontFamily: "Bricolage Grotesque, sans-serif",
            }}
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          >
            {partnerUsername.charAt(0).toUpperCase()}
          </motion.div>
          <p
            className="text-base font-medium"
            style={{ color: "oklch(0.65 0.08 145)" }}
          >
            Connecting…
          </p>
        </div>
      )}

      {/* Duration timer overlay */}
      <div
        className="absolute top-safe-top top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full"
        style={{
          background: "oklch(0.08 0.04 155 / 0.75)",
          border: "1px solid oklch(0.3 0.08 155 / 0.4)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span
          className="text-sm font-mono tabular-nums"
          style={{ color: "oklch(0.75 0.15 145)" }}
        >
          {formatDuration(callDurationSeconds)}
        </span>
      </div>

      {/* Local video PiP */}
      <div
        className="absolute bottom-28 right-4 overflow-hidden rounded-xl"
        style={{
          width: 100,
          height: 140,
          border: "2px solid oklch(0.4 0.12 155 / 0.6)",
          boxShadow: "0 4px 20px oklch(0 0 0 / 0.5)",
          background: "oklch(0.1 0.05 155)",
        }}
      >
        {isCameraOff ? (
          <div className="w-full h-full flex items-center justify-center">
            <VideoOff
              className="w-6 h-6"
              style={{ color: "oklch(0.55 0.08 155)" }}
            />
          </div>
        ) : (
          <VideoEl
            stream={localStream}
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Control bar */}
      <div
        className="absolute bottom-0 left-0 right-0 pb-safe-bottom pb-6 px-4"
        style={{
          background:
            "linear-gradient(0deg, oklch(0 0 0 / 0.8) 0%, transparent 100%)",
        }}
      >
        <div
          className="flex items-center justify-center gap-5 py-4 px-6 rounded-2xl mx-auto max-w-sm"
          style={{
            background: "oklch(0.1 0.05 155 / 0.8)",
            border: "1px solid oklch(0.3 0.08 155 / 0.3)",
            backdropFilter: "blur(16px)",
          }}
        >
          <ControlBtn
            icon={isCameraOff ? VideoOff : Video}
            label="Camera"
            onClick={toggleCamera}
            active={isCameraOff}
            ocid="active_call.toggle"
          />
          <ControlBtn
            icon={isMuted ? MicOff : Mic}
            label={isMuted ? "Unmute" : "Mute"}
            onClick={onToggleMute}
            active={isMuted}
            ocid="active_call.mute_toggle"
          />
          <ControlBtn
            icon={isSpeakerOn ? Volume2 : VolumeX}
            label="Speaker"
            onClick={onToggleSpeaker}
            active={isSpeakerOn}
            ocid="active_call.speaker_toggle"
          />
          <ControlBtn
            icon={UserPlus}
            label="Add"
            onClick={() => toast.info("Feature coming soon")}
            ocid="active_call.add_button"
          />
          {/* End call */}
          <motion.button
            data-ocid="active_call.end_button"
            onClick={onEnd}
            aria-label="End call"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.52 0.22 22) 0%, oklch(0.45 0.2 15) 100%)",
              boxShadow: "0 4px 18px oklch(0.5 0.22 22 / 0.5)",
            }}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.93 }}
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function ActiveCallScreen(props: ActiveCallScreenProps) {
  if (props.callType === CallType.video) {
    return <VideoCallUI {...props} />;
  }
  return <VoiceCallUI {...props} />;
}
