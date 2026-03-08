import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { LogOut, MessageSquare, Settings, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import ActiveCallScreen from "../components/ActiveCallScreen";
import AdminPanel from "../components/AdminPanel";
import ChatView from "../components/ChatView";
import ConversationList from "../components/ConversationList";
import IncomingCallScreen from "../components/IncomingCallScreen";
import MyBucksPill from "../components/MyBucksPill";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import SettingsModal from "../components/SettingsModal";
import { useApp } from "../context/AppContext";
import { CallProvider, useCall } from "../context/CallContext";
import { useIsMobile } from "../hooks/use-mobile";
import { useActor } from "../hooks/useActor";
import { formatSerial } from "../utils/crypto";

function AppPageInner() {
  const { currentUser, logout } = useApp();
  const { actor } = useActor();
  const isMobile = useIsMobile();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const isAdmin = currentUser?.username === "Ayaan";

  const {
    callPhase,
    callType,
    partnerUsername: callPartner,
    localStream,
    remoteStream,
    callDurationSeconds,
    answerCall,
    declineCall,
    endCall,
    toggleSpeaker,
    toggleMute,
    isSpeakerOn,
    isMuted,
  } = useCall();

  // On mobile, track whether we're showing the sidebar or the chat
  const showSidebar = !isMobile || activeChat === null;
  const showChat = !isMobile || activeChat !== null;

  const handleSelectChat = (username: string) => {
    setActiveChat(username);
  };

  const handleBackToList = () => {
    setActiveChat(null);
  };

  const handleRemoveConversation = (username: string) => {
    if (activeChat === username) {
      setActiveChat(null);
    }
  };

  const handleLogout = () => {
    logout(actor);
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
        {/* Top Bar */}
        <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card z-10 flex-shrink-0 sm:gap-3 sm:px-4 sm:py-2.5">
          {/* Logo — hidden on mobile when viewing a chat */}
          {(!isMobile || !activeChat) && (
            <div className="flex items-center gap-2 mr-1 flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-bold text-base tracking-tight text-foreground hidden sm:block">
                Myapp
              </span>
            </div>
          )}

          {/* Center search — hidden on mobile when viewing a chat */}
          {(!isMobile || !activeChat) && (
            <div className="flex-1 flex justify-center min-w-0">
              <SearchBar onOpenChat={handleSelectChat} />
            </div>
          )}

          {/* Chat partner name on mobile when in chat */}
          {isMobile && activeChat && (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/35 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {activeChat.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-sm text-foreground truncate">
                {activeChat}
              </span>
            </div>
          )}

          {/* Right side controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Serial badge — desktop only */}
            {currentUser && (
              <span className="serial-badge text-muted-foreground hidden sm:inline">
                {formatSerial(currentUser.serialNumber)}
              </span>
            )}

            {/* MyBucks */}
            <MyBucksPill compact={isMobile} />

            {/* Notification Bell */}
            <NotificationBell />

            {/* Settings */}
            <Button
              data-ocid="nav.settings_button"
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            {/* Admin (Ayaan only) */}
            {isAdmin && (
              <Button
                data-ocid="nav.admin_button"
                variant="ghost"
                size="icon"
                onClick={() => setAdminOpen(true)}
                className="h-8 w-8 sm:h-9 sm:w-9 text-primary hover:bg-primary/15 transition-colors"
                aria-label="Admin Panel"
              >
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            )}

            {/* Exit */}
            <Button
              data-ocid="nav.exit_button"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 sm:h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors gap-1 text-xs font-medium px-2 sm:px-3"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </header>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Conversation sidebar */}
          <AnimatePresence initial={false}>
            {showSidebar && (
              <motion.aside
                key="sidebar"
                initial={
                  isMobile ? { x: -20, opacity: 0 } : { opacity: 0, x: -20 }
                }
                animate={{ x: 0, opacity: 1 }}
                exit={isMobile ? { x: -20, opacity: 0 } : { opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={`flex-shrink-0 overflow-hidden ${
                  isMobile ? "w-full absolute inset-0 z-10" : "w-64"
                }`}
              >
                <ConversationList
                  activeUsername={activeChat}
                  onSelect={handleSelectChat}
                  onRemove={handleRemoveConversation}
                />
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Chat area */}
          <AnimatePresence initial={false}>
            {showChat && (
              <motion.main
                key="chat"
                initial={isMobile ? { x: 20, opacity: 0 } : { opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={isMobile ? { x: 20, opacity: 0 } : { opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={`overflow-hidden ${
                  isMobile ? "w-full absolute inset-0 z-10" : "flex-1 flex"
                }`}
              >
                <ChatView
                  partnerUsername={activeChat}
                  onBack={isMobile && activeChat ? handleBackToList : undefined}
                />
              </motion.main>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />

      {/* Incoming call overlay */}
      {callPhase === "incoming_ringing" && callPartner && callType && (
        <IncomingCallScreen
          callerUsername={callPartner}
          callType={callType}
          onAccept={answerCall}
          onDecline={declineCall}
        />
      )}

      {/* Active call overlay */}
      {callPhase === "active" && callPartner && callType && (
        <ActiveCallScreen
          callType={callType}
          partnerUsername={callPartner}
          localStream={localStream}
          remoteStream={remoteStream}
          callDurationSeconds={callDurationSeconds}
          onEnd={endCall}
          onToggleSpeaker={toggleSpeaker}
          onToggleMute={toggleMute}
          isSpeakerOn={isSpeakerOn}
          isMuted={isMuted}
        />
      )}
    </>
  );
}

export default function AppPage() {
  return (
    <CallProvider>
      <AppPageInner />
    </CallProvider>
  );
}
