import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, X } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useConversations, useRemoveConversation } from "../hooks/useQueries";
import { formatTimestamp } from "../utils/crypto";

interface ConversationListProps {
  activeUsername: string | null;
  onSelect: (username: string) => void;
  onRemove?: (username: string) => void;
}

export default function ConversationList({
  activeUsername,
  onSelect,
  onRemove,
}: ConversationListProps) {
  const { data: conversations, isLoading } = useConversations();
  const removeConversation = useRemoveConversation();

  const handleRemove = async (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    try {
      await removeConversation.mutateAsync(username);
      onRemove?.(username);
      toast.success(`Conversation with ${username} removed`);
    } catch {
      toast.error("Failed to remove conversation");
    }
  };

  return (
    <div
      data-ocid="chat.conversation_list"
      className="flex flex-col h-full bg-card border-r border-border"
    >
      <div className="px-4 py-4 border-b border-border">
        <h2 className="font-display text-sm font-semibold text-foreground/70 uppercase tracking-wider">
          Conversations
        </h2>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-10 h-10 rounded-full bg-secondary/60" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24 bg-secondary/60" />
                  <Skeleton className="h-3 w-36 bg-secondary/40" />
                </div>
              </div>
            ))}
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div
            data-ocid="chat.empty_state"
            className="flex flex-col items-center justify-center h-48 p-6 text-center"
          >
            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No conversations yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Search a serial to start messaging
            </p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conv, index) => {
              const isActive = activeUsername === conv.username;
              const ocid = `chat.item.${index + 1}`;

              return (
                <motion.div
                  key={conv.username}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="group relative"
                >
                  <button
                    type="button"
                    data-ocid={ocid}
                    onClick={() => onSelect(conv.username)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                      isActive
                        ? "bg-primary/15 border border-primary/25"
                        : "hover:bg-secondary/50"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isActive
                          ? "bg-primary/25 text-primary border border-primary/40"
                          : "bg-secondary text-foreground/70"
                      }`}
                    >
                      {conv.username.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-semibold truncate ${
                            isActive ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {conv.username}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                            {formatTimestamp(conv.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.lastMessage.senderUsername === conv.username
                            ? ""
                            : "You: "}
                          {conv.lastMessage.text}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Remove button */}
                  <button
                    type="button"
                    data-ocid={`chat.conversation_remove_button.${index + 1}`}
                    onClick={(e) => handleRemove(e, conv.username)}
                    disabled={removeConversation.isPending}
                    aria-label={`Remove conversation with ${conv.username}`}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 touch-manipulation"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
