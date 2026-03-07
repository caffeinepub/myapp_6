import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, Search, Send, Trash2, UserX } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Message } from "../backend.d";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { useSendMessage } from "../hooks/useQueries";
import { formatTimestamp, parseSerial } from "../utils/crypto";

interface GuestContact {
  username: string;
  displayName: string;
  serial: bigint;
}

export default function GuestPage() {
  const { setView } = useApp();
  const { actor } = useActor();
  const [serialInput, setSerialInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [contact, setContact] = useState<GuestContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const sendMessage = useSendMessage();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      toast.error("Not connected");
      return;
    }
    const serial = parseSerial(serialInput);
    if (serial === null) {
      toast.error("Enter a valid serial number (e.g. #00123)");
      return;
    }
    setSearching(true);
    try {
      const result = await actor.searchBySerial(serial);
      setContact({ ...result, serial });
      // Store in sessionStorage (guest ephemeral)
      sessionStorage.setItem(
        "guestContact",
        JSON.stringify({ ...result, serial: serial.toString() }),
      );
    } catch {
      toast.error("User not found for that serial");
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !messageText.trim()) return;
    try {
      await sendMessage.mutateAsync({
        recipientUsername: contact.username,
        text: messageText.trim(),
      });
      // Optimistic local update for guest
      const fakeMsg: Message = {
        id: BigInt(Date.now()),
        text: messageText.trim(),
        senderUsername: "Anonymous",
        isRead: false,
        timestamp: BigInt(Date.now()) * 1_000_000n,
        recipientUsername: contact.username,
      };
      setMessages((prev) => [...prev, fakeMsg]);
      setMessageText("");
    } catch {
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(0.9 0 0) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView("login")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Guest Mode</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Messages cleared when you close this tab
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-5">
          {!contact ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter a serial number to contact one person. Your session will
                  be wiped when you close this tab.
                </p>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    placeholder="#00001"
                    className="bg-input/50 border-border h-10 font-mono"
                    disabled={searching}
                  />
                  <Button
                    type="submit"
                    disabled={searching}
                    className="h-10 bg-primary text-primary-foreground px-4"
                  >
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Contact header */}
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">
                    {contact.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {contact.displayName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{contact.username}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-muted-foreground"
                  onClick={() => setContact(null)}
                >
                  Change
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="h-64">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  <div className="space-y-2 p-1">
                    {messages.map((msg) => (
                      <div
                        key={msg.id.toString()}
                        className="flex justify-end items-end gap-1.5 group"
                      >
                        <button
                          type="button"
                          data-ocid="chat.delete_button"
                          onClick={() =>
                            setMessages((prev) =>
                              prev.filter((m) => m.id !== msg.id),
                            )
                          }
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0 p-1 rounded"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="msg-bubble-sent max-w-[80%] px-3 py-2 text-sm">
                          <div className="text-[10px] opacity-60 mb-0.5 font-medium">
                            Anonymous
                          </div>
                          {msg.text}
                          <div className="text-[10px] opacity-70 mt-0.5 text-right">
                            {formatTimestamp(msg.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Message input */}
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  data-ocid="chat.message_input"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message…"
                  className="bg-input/50 border-border h-10 text-sm"
                  disabled={sendMessage.isPending}
                />
                <Button
                  type="submit"
                  data-ocid="chat.send_button"
                  disabled={sendMessage.isPending || !messageText.trim()}
                  size="icon"
                  className="h-10 w-10 bg-primary text-primary-foreground flex-shrink-0"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
