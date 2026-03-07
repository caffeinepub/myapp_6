import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import {
  useConversation,
  useMarkAsRead,
  useSendMessage,
} from "../hooks/useQueries";
import { formatTimestamp } from "../utils/crypto";

interface ChatViewProps {
  partnerUsername: string | null;
  onBack?: () => void;
}

export default function ChatView({ partnerUsername, onBack }: ChatViewProps) {
  const { currentUser } = useApp();
  const { data: messages, isLoading } = useConversation(partnerUsername);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }); // intentionally no deps — runs after every render to track new messages

  // Mark unread messages as read when opening conversation
  const markAsReadMutate = markAsRead.mutate;
  useEffect(() => {
    if (!messages || !partnerUsername) return;
    const unread = messages.filter(
      (m) => !m.isRead && m.senderUsername === partnerUsername,
    );
    for (const m of unread) {
      markAsReadMutate(m.id);
    }
  }, [messages, partnerUsername, markAsReadMutate]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerUsername || !text.trim()) return;

    try {
      await sendMessage.mutateAsync({
        recipientUsername: partnerUsername,
        text: text.trim(),
      });
      setText("");
    } catch {
      toast.error("Failed to send message");
    }
  };

  if (!partnerUsername) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-8 text-center h-full">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-primary/50" />
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground/60 mb-1">
          Select a conversation
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose someone to message or search by serial number
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden h-full w-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border bg-card flex-shrink-0 sm:px-5 sm:py-3.5">
        {/* Back button on mobile */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0 -ml-1"
            aria-label="Back to conversations"
            data-ocid="chat.back_button"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/35 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
          {partnerUsername.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground truncate">
            {partnerUsername}
          </div>
          <div className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${messages?.length ?? 0} messages`}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-3 sm:px-4 sm:py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
              >
                <Skeleton
                  className={`h-10 rounded-2xl bg-secondary/60 ${
                    i % 2 === 0 ? "w-40" : "w-52"
                  }`}
                />
              </div>
            ))}
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-2">
              {messages.map((msg, i) => {
                const isMine = msg.senderUsername === currentUser?.username;
                const showDate =
                  i === 0 ||
                  (messages[i - 1] &&
                    formatTimestamp(messages[i - 1].timestamp) !==
                      formatTimestamp(msg.timestamp));

                return (
                  <motion.div
                    key={msg.id.toString()}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {showDate && (
                      <div className="text-center my-3">
                        <span className="text-[10px] text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-full">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] px-3.5 py-2 text-sm ${
                          isMine ? "msg-bubble-sent" : "msg-bubble-recv"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Message input — safe area bottom padding for mobile */}
      <div className="px-3 py-3 border-t border-border bg-card flex-shrink-0 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            data-ocid="chat.message_input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${partnerUsername}…`}
            className="flex-1 bg-input/50 border-border h-10 text-sm focus:border-primary/60 touch-manipulation"
            disabled={sendMessage.isPending}
            style={{ fontSize: "16px" }} /* prevent iOS zoom on focus */
          />
          <Button
            type="submit"
            data-ocid="chat.send_button"
            disabled={sendMessage.isPending || !text.trim()}
            size="icon"
            className="h-10 w-10 bg-primary text-primary-foreground flex-shrink-0 hover:opacity-90 transition-opacity touch-manipulation"
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
