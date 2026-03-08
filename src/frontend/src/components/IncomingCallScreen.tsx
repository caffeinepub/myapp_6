import { Phone, PhoneOff, Video } from "lucide-react";
import { motion } from "motion/react";
import { CallType } from "../backend.d";

interface IncomingCallScreenProps {
  callerUsername: string;
  callType: CallType;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallScreen({
  callerUsername,
  callType,
  onAccept,
  onDecline,
}: IncomingCallScreenProps) {
  const initial = callerUsername.charAt(0).toUpperCase();

  return (
    <div
      data-ocid="incoming_call.dialog"
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.09 0.06 155) 0%, oklch(0.06 0.04 155) 100%)",
      }}
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, oklch(0.3 0.1 155 / 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 80%, oklch(0.2 0.08 155 / 0.1) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-sm">
        {/* Status pill + label */}
        <div className="flex items-center gap-3 mb-10">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
            style={{
              background: "oklch(0.35 0.12 155 / 0.4)",
              color: "oklch(0.72 0.18 145)",
              border: "1px solid oklch(0.5 0.16 145 / 0.4)",
            }}
          >
            Inbound
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "oklch(0.65 0.2 145)" }}
            />
            <span className="text-sm" style={{ color: "oklch(0.72 0.15 145)" }}>
              {callType === CallType.video ? "Video call" : "Voice call"}
            </span>
          </div>
        </div>

        {/* Avatar with pulse rings */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Outer pulse ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 140,
              height: 140,
              background: "oklch(0.5 0.18 145 / 0.12)",
              border: "1px solid oklch(0.5 0.18 145 / 0.2)",
            }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{
              duration: 2.4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          {/* Inner pulse ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 116,
              height: 116,
              background: "oklch(0.5 0.18 145 / 0.15)",
              border: "1px solid oklch(0.55 0.2 145 / 0.3)",
            }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0.1, 0.7] }}
            transition={{
              duration: 2.4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.4,
            }}
          />
          {/* Avatar circle */}
          <div
            className="relative w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold z-10"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.22 145) 0%, oklch(0.42 0.18 160) 100%)",
              boxShadow:
                "0 0 0 3px oklch(0.4 0.12 155), 0 8px 32px oklch(0.45 0.2 145 / 0.5)",
              color: "oklch(0.97 0.01 100)",
              fontFamily: "Bricolage Grotesque, sans-serif",
            }}
          >
            {initial}
          </div>

          {/* Call type icon badge */}
          <div
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center z-20"
            style={{
              background:
                callType === CallType.video
                  ? "linear-gradient(135deg, oklch(0.6 0.18 195), oklch(0.5 0.2 210))"
                  : "linear-gradient(135deg, oklch(0.55 0.2 145), oklch(0.45 0.18 155))",
              border: "2px solid oklch(0.09 0.06 155)",
            }}
          >
            {callType === CallType.video ? (
              <Video className="w-3.5 h-3.5 text-white" />
            ) : (
              <Phone className="w-3.5 h-3.5 text-white" />
            )}
          </div>
        </div>

        {/* Caller name */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2
            className="text-2xl font-bold mb-1"
            style={{
              color: "oklch(0.96 0.01 100)",
              fontFamily: "Bricolage Grotesque, sans-serif",
            }}
          >
            {callerUsername}
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.6 0.06 155)" }}>
            Incoming {callType === CallType.video ? "video" : "voice"} call…
          </p>
        </motion.div>

        {/* Decline / Accept buttons */}
        <div className="flex items-center gap-6 w-full justify-center">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              data-ocid="incoming_call.decline_button"
              onClick={onDecline}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.52 0.22 22) 0%, oklch(0.45 0.2 15) 100%)",
                boxShadow: "0 4px 20px oklch(0.5 0.22 22 / 0.5)",
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              aria-label="Decline call"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </motion.button>
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.65 0.06 22)" }}
            >
              Decline
            </span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              data-ocid="incoming_call.accept_button"
              onClick={onAccept}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.62 0.22 145) 0%, oklch(0.5 0.2 155) 100%)",
                boxShadow: "0 4px 20px oklch(0.58 0.22 145 / 0.55)",
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              aria-label="Accept call"
            >
              <Phone className="w-6 h-6 text-white" />
            </motion.button>
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.72 0.18 145)" }}
            >
              Accept
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
