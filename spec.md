# Myapp

## Current State
Full-stack messaging app with:
- Username/password auth with session tokens (per-tab isolation via sessionStorage)
- Serial number system for user discovery (#00001, etc.)
- Conversation list + real-time polling chat
- MyBucks wallet, notifications, settings, admin panel
- Guest mode (Anonymous sender, delete icon on guest messages)
- Delete own messages, remove conversations
- Backend: Motoko with users, messages, session tokens maps

## Requested Changes (Diff)

### Add
- **Call button** in chat header (top-right of ChatView) — clicking opens a modal asking "Voice Call" or "Video Call"
- **WebRTC call signaling** via backend polling: callerUsername, calleeUsername, callType (voice/video), callStatus (ringing/accepted/declined/ended), ICE candidates & SDP offers/answers stored per call session
- **Incoming call screen** (full-screen dark green overlay): shows caller avatar, name, serial; red Decline + green Accept buttons — styled after call-ui-1.webp
- **Active voice call screen** (full-screen overlay): dark card with caller info, Speaker toggle button, Add Someone button, red End Call button — styled after call-ui-1.webp active state
- **Active video call screen** (full-screen dark overlay): large remote video feed, local video PiP (bottom-right corner), bottom control bar with Speaker, Add Someone, End Call buttons — styled after vc-2.webp adapted to 1-on-1
- **Ringtone audio**: callee hears loud ringtone loop; caller hears ringing tone loop while waiting
- **Call status messages** appear in the chat after call ends: "Missed call", "Call ended · Xm Xs", "Call declined"
- **Call type chooser modal**: small bottom-sheet/dialog with Voice Call and Video Call options

### Modify
- ChatView: add call icon button in header (top-right), wire up call type chooser
- AppPage: mount global IncomingCallScreen overlay that polls for incoming calls
- Backend: add call signaling tables and functions

### Remove
- Nothing removed

## Implementation Plan
1. Add Motoko call signaling: `CallSession` type, `initiateCall`, `answerCall`, `declineCall`, `endCall`, `getIncomingCall`, `getCallSession`, `sendIceCandidate`, `sendSdpOffer`, `sendSdpAnswer` functions — all token-authenticated
2. Regenerate backend.d.ts to expose new APIs
3. Create `CallContext` (React context) to hold active call state, WebRTC peer connection, streams, ringtone refs
4. Create `CallTypeModal` component — small dialog: Voice Call / Video Call
5. Create `IncomingCallScreen` component — full-screen dark green overlay with Decline/Accept
6. Create `ActiveCallScreen` component — handles both voice and video modes; video mode shows remote video large + local PiP; voice mode shows avatar + name; controls: Speaker, Add Someone, End
7. Wire call icon in ChatView header
8. Mount IncomingCallScreen + ActiveCallScreen in AppPage, driven by CallContext
9. Add polling in CallContext to detect incoming calls (every 2s)
10. Implement ringtone using Web Audio API oscillator (no external file dependency)
11. Implement WebRTC: getUserMedia, RTCPeerConnection, ICE/SDP exchange via backend polling
12. Post call status messages to chat on call end/miss/decline
