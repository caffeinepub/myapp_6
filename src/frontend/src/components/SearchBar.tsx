import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { formatSerial, parseSerial } from "../utils/crypto";

interface SearchResult {
  username: string;
  displayName: string;
  serial: bigint;
}

interface SearchBarProps {
  onOpenChat: (username: string) => void;
}

export default function SearchBar({ onOpenChat }: SearchBarProps) {
  const { actor } = useActor();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !query.trim()) return;

    const serial = parseSerial(query.trim());
    if (serial === null) {
      toast.error("Enter a valid serial like #00123");
      return;
    }

    setSearching(true);
    try {
      const res = await actor.searchBySerial(serial);
      setResult({ ...res, serial });
      setOpen(true);
    } catch {
      toast.error("No user found for that serial number");
    } finally {
      setSearching(false);
    }
  };

  const handleOpenChat = () => {
    if (!result) return;
    onOpenChat(result.username);
    setOpen(false);
    setQuery("");
    setResult(null);
  };

  return (
    <>
      <form onSubmit={handleSearch} className="relative flex items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            data-ocid="nav.search_input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search #serial…"
            className="pl-8 pr-8 h-8 w-48 bg-secondary/50 border-border/60 focus:border-primary/60 text-sm placeholder:text-muted-foreground/70 font-mono"
            disabled={searching}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-1 text-muted-foreground hover:text-foreground"
          disabled={searching || !query}
        >
          {searching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
        </Button>
      </form>

      {result && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            data-ocid="search.result_card"
            className="glass-panel border-border max-w-sm"
          >
            <DialogHeader>
              <DialogTitle className="font-display text-lg">
                User Found
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-4 py-3">
              <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-xl font-display font-bold text-primary">
                {result.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-base">
                  {result.displayName}
                </div>
                <div className="text-sm text-muted-foreground">
                  @{result.username}
                </div>
                <div className="serial-badge text-primary/70 mt-0.5">
                  {formatSerial(result.serial)}
                </div>
              </div>
            </div>
            <Button
              data-ocid="search.send_button"
              onClick={handleOpenChat}
              className="w-full bg-primary text-primary-foreground hover:opacity-90"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
