# Myapp

## Current State
- Full messaging app with login/register, serial numbers, MyBucks, admin panel (enhance, ban, terminate, unban), guest mode, call system (voice/video via WebRTC with polling-based signaling), notification bell.
- Admin panel has: Enhance box, Execute box (ban/terminate toggle).
- Backend already has `unbanWithToken`. Frontend AdminPanel does not expose it yet.
- WebRTC call flow has bugs: SDP offer sent before ICE gathering completes, callee-side SDP/ICE exchange has timing issues, no push notifications for offline users.
- No system/broadcast notification mechanism.
- No detonation mode or impersonation capability.

## Requested Changes (Diff)

### Add
- **Unban control** in admin panel: input for serial + Unban button.
- **Broadcast/system message control** in admin panel: target (everyone or specific serial), message text, send button. Message arrives as a notification popup (not stored in chat), uses a new backend `systemNotificationWithToken` function that either sends to one user or all users, stored as a special notification type the bell polls for.
- **MyBucks enhance notification**: when admin enhances a user, that user gets a notification popup saying "You received X MyBucks from Admin".
- **Detonation Mode** in admin panel:
  - Warning triangle icon at top of admin panel.
  - Click → prompt for supreme admin password "Aanya".
  - If correct → prompt to type "delete" in a text field → activates detonation mode.
  - Detonation mode shows a full-screen overlay listing ALL accounts with their usernames, display names, serials, and passwords (plaintext from backend).
  - Can select one or multiple accounts with checkboxes.
  - Per-account actions: Delete account, Remove MyBucks (input amount), Impersonate (send a message AS that user to another user — enter recipient serial + message text).
  - Detonation mode can be toggled OFF by clicking the triangle again in the admin panel header.
- **Browser push notifications for calls**:
  - On login/app load, request `Notification` permission from the browser.
  - When polling detects an incoming call and the tab is backgrounded/hidden, fire a browser `Notification` with the caller name and call type, so the phone/laptop alerts the user even if the tab is not in focus.
  - Service worker registration for persistent background push (best-effort; degrades gracefully if not supported).

- **WebRTC complete rewrite** (fix calls):
  - Use `iceGatheringComplete` promise (wait for `icegatheringstate === 'complete'` or `onicegatheringcomplete`) before sending SDP offer, so all candidates are bundled in the SDP (Vanilla ICE / ICE restart approach).
  - Alternatively: use `addIceCandidate` trickling correctly — create PC first, set local description, then start gathering, send offer only after `setLocalDescription`, apply remote description as soon as available, buffer ICE candidates until remote description is set.
  - Callee flow: answer → create PC → get media → add tracks → set remote description from sdpOffer → create answer → setLocalDescription → send answer → exchange ICE.
  - Caller flow: create PC → get media → add tracks → createOffer → setLocalDescription → send offer → poll for answer → setRemoteDescription when answer arrives → exchange ICE.
  - Both sides: buffer incoming ICE candidates until `remoteDescription` is set, then apply in order.
  - Add TURN server fallback (use public free TURN or note limitation) for NAT traversal.
  - Remote audio element created and attached to `remoteStream` so audio actually plays (not just video).
  - Fix `cleanupCall` to not reference stale `localStream` from closure (use ref instead).

### Modify
- **Backend `main.mo`**:
  - Add `systemNotification` type and storage: `type Notification = { id: Nat; recipientUsername: Text; text: Text; timestamp: Int; isRead: Bool }`.
  - Add `sendSystemNotificationWithToken(targetSerial: ?Nat, text: Text, token: Text)` — if targetSerial is null, send to all users; if set, send to that serial's user.
  - Add `enhanceWithToken` — after enhancing, also create a system notification for the enhanced user: "You received X MyBucks from Admin".
  - Add `getNotificationsWithToken(token: Text)` — returns unread notifications for caller.
  - Add `markNotificationReadWithToken(id: Nat, token: Text)`.
  - Add `getAllUsersWithPasswords(token: Text)` — admin-only, returns array of `{ username, displayName, serial, passwordHash, myBucksBalance }`.
  - Add `impersonateSendWithToken(senderSerial: Nat, recipientSerial: Nat, text: Text, token: Text)` — admin-only, sends a message with the impersonated user's username as sender.
  - Add `adminRemoveMyBucksWithToken(serial: Nat, amount: Nat, token: Text)` — admin-only, deducts MyBucks.
- **NotificationBell** — also polls for system notifications and shows them as toasts and in the dropdown list.
- **AdminPanel** — add all new controls described above.
- **CallContext** — complete WebRTC rewrite with correct ICE/SDP sequencing and push notification trigger.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `main.mo`: add Notification type/storage, `sendSystemNotificationWithToken`, `getNotificationsWithToken`, `markNotificationReadWithToken`, `getAllUsersWithPasswords`, `impersonateSendWithToken`, `adminRemoveMyBucksWithToken`, update `enhanceWithToken` to also create notification.
2. Update `backend.d.ts` to reflect new backend functions.
3. Rewrite `CallContext.tsx`: proper ICE buffering, wait for gathering before sending offer (or use trickle ICE correctly), fix callee answer flow, fix `cleanupCall` closure bug, add `remoteAudioRef` element, add browser Notification API trigger on incoming call.
4. Update `AdminPanel.tsx`: add Unban box, Broadcast box, Detonation Mode (triangle → password → confirm → full-screen account list with select + actions).
5. Update `NotificationBell.tsx`: poll `getNotificationsWithToken`, show system notification toasts, mark as read.
6. Add push notification permission request on app load in `AppPage.tsx`.
7. Validate (typecheck + build), fix any errors.
