import { Phone, Video, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { CallType } from "../backend.d";

interface CallTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: CallType) => void;
  partnerUsername: string;
}

export default function CallTypeModal({
  open,
  onClose,
  onSelect,
  partnerUsername,
}: CallTypeModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-ocid="call_type_modal.dialog"
          className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            className="relative z-10 w-full sm:w-96 mx-4 mb-6 sm:mb-0 rounded-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, oklch(0.18 0.06 155) 0%, oklch(0.13 0.04 155) 100%)",
              border: "1px solid oklch(0.35 0.08 155 / 0.5)",
              boxShadow:
                "0 24px 64px oklch(0 0 0 / 0.7), 0 0 0 1px oklch(0.4 0.1 155 / 0.15)",
            }}
            initial={{ y: 40, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/70">
                  Start a call
                </p>
                <h3
                  className="text-base font-bold mt-0.5"
                  style={{ color: "oklch(0.94 0.01 100)" }}
                >
                  {partnerUsername}
                </h3>
              </div>
              <button
                type="button"
                data-ocid="call_type_modal.close_button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: "oklch(0.6 0.01 260)" }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Divider */}
            <div
              className="h-px mx-5"
              style={{ background: "oklch(0.35 0.08 155 / 0.3)" }}
            />

            {/* Call type buttons */}
            <div className="grid grid-cols-2 gap-3 p-5">
              {/* Voice Call */}
              <motion.button
                data-ocid="call_type_modal.voice_button"
                onClick={() => onSelect(CallType.voice)}
                className="group flex flex-col items-center gap-3 py-5 px-4 rounded-xl transition-all"
                style={{
                  background: "oklch(0.22 0.05 155 / 0.6)",
                  border: "1px solid oklch(0.4 0.1 155 / 0.3)",
                }}
                whileHover={{
                  scale: 1.03,
                  backgroundColor: "oklch(0.26 0.08 155 / 0.8)",
                }}
                whileTap={{ scale: 0.97 }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.55 0.2 145) 0%, oklch(0.45 0.18 155) 100%)",
                    boxShadow: "0 4px 16px oklch(0.5 0.2 145 / 0.4)",
                  }}
                >
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "oklch(0.92 0.01 100)" }}
                  >
                    Voice Call
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.6 0.03 155)" }}
                  >
                    Audio only
                  </p>
                </div>
              </motion.button>

              {/* Video Call */}
              <motion.button
                data-ocid="call_type_modal.video_button"
                onClick={() => onSelect(CallType.video)}
                className="group flex flex-col items-center gap-3 py-5 px-4 rounded-xl transition-all"
                style={{
                  background: "oklch(0.22 0.05 155 / 0.6)",
                  border: "1px solid oklch(0.4 0.1 155 / 0.3)",
                }}
                whileHover={{
                  scale: 1.03,
                  backgroundColor: "oklch(0.26 0.08 155 / 0.8)",
                }}
                whileTap={{ scale: 0.97 }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.6 0.18 195) 0%, oklch(0.5 0.2 210) 100%)",
                    boxShadow: "0 4px 16px oklch(0.55 0.18 195 / 0.4)",
                  }}
                >
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "oklch(0.92 0.01 100)" }}
                  >
                    Video Call
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.6 0.03 155)" }}
                  >
                    Camera + audio
                  </p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
