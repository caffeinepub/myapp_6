import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface CallSession {
    id: string;
    status: CallStatus;
    startedAt: bigint;
    endedAt: bigint;
    callType: CallType;
    sdpOffer?: string;
    callerUsername: string;
    callerIceCandidates: Array<string>;
    answeredAt: bigint;
    calleeIceCandidates: Array<string>;
    calleeUsername: string;
    sdpAnswer?: string;
}
export interface Notification {
    id: bigint;
    text: string;
    isRead: boolean;
    timestamp: bigint;
    recipientUsername: string;
}
export interface Message {
    id: bigint;
    text: string;
    senderUsername: string;
    isRead: boolean;
    timestamp: bigint;
    recipientUsername: string;
}
export interface AdminUserInfo {
    username: string;
    displayName: string;
    serialNumber: bigint;
    isBanned: boolean;
    banExpiryTimestamp: bigint;
    passwordHash: string;
    myBucksBalance: bigint;
}
export interface ConversationSummary {
    username: string;
    lastMessage?: Message;
}
export interface UserProfile {
    username: string;
    displayName: string;
    serialNumber: bigint;
    isBanned: boolean;
    banExpiryTimestamp: bigint;
    myBucksBalance: bigint;
}
export enum CallStatus {
    ringing = "ringing",
    ended = "ended",
    accepted = "accepted",
    declined = "declined"
}
export enum CallType {
    video = "video",
    voice = "voice"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addIceCandidateWithToken(callId: string, candidate: string, token: string): Promise<void>;
    adminRemoveMyBucksWithToken(serial: bigint, amount: bigint, token: string): Promise<void>;
    answerCallWithToken(callId: string, token: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    banWithToken(serial: bigint, days: bigint, token: string): Promise<void>;
    declineCallWithToken(callId: string, token: string): Promise<void>;
    deleteMessageWithToken(messageId: bigint, token: string): Promise<void>;
    endCallWithToken(callId: string, token: string): Promise<void>;
    enhanceWithToken(serial: bigint, amount: bigint, token: string): Promise<void>;
    getAllConversationsWithToken(token: string): Promise<Array<ConversationSummary>>;
    getAllUsersWithPasswords(token: string): Promise<Array<AdminUserInfo>>;
    getCallSessionWithToken(callId: string, token: string): Promise<CallSession | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getConversationWithToken(otherUsername: string, token: string): Promise<Array<Message>>;
    getIncomingCallWithToken(token: string): Promise<CallSession | null>;
    getLatestUnreadMessageSenderWithToken(token: string): Promise<string | null>;
    getMyBucksBalanceWithToken(token: string): Promise<bigint>;
    getNotificationsWithToken(token: string): Promise<Array<Notification>>;
    getUnreadMessageCountWithToken(token: string): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserProfileByUsername(username: string): Promise<UserProfile>;
    impersonateSendWithToken(senderSerial: bigint, recipientSerial: bigint, text: string, token: string): Promise<void>;
    initiateCallWithToken(calleeUsername: string, callType: CallType, token: string): Promise<string>;
    isCallerAdmin(): Promise<boolean>;
    loginWithToken(username: string, passwordHash: string, sessionToken: string): Promise<UserProfile>;
    logoutToken(sessionToken: string): Promise<void>;
    markMessageAsReadWithToken(messageId: bigint, token: string): Promise<void>;
    markNotificationReadWithToken(id: bigint, token: string): Promise<void>;
    registerWithToken(username: string, passwordHash: string, displayName: string, sessionToken: string): Promise<bigint>;
    removeConversationWithToken(otherUsername: string, token: string): Promise<void>;
    saveCallerUserProfile(arg0: UserProfile): Promise<void>;
    searchBySerial(serial: bigint): Promise<{
        username: string;
        displayName: string;
    }>;
    sendMessageWithToken(recipientUsername: string, text: string, token: string): Promise<void>;
    sendSdpAnswerWithToken(callId: string, sdp: string, token: string): Promise<void>;
    sendSdpOfferWithToken(callId: string, sdp: string, token: string): Promise<void>;
    sendSystemNotificationWithToken(targetSerial: bigint, text: string, token: string): Promise<void>;
    terminateWithToken(serial: bigint, token: string): Promise<void>;
    unbanWithToken(serial: bigint, token: string): Promise<void>;
    updateDisplayNameWithToken(newDisplayName: string, token: string): Promise<void>;
    updatePasswordWithToken(currentPasswordHash: string, newPasswordHash: string, token: string): Promise<void>;
    updateUsernameWithToken(newUsername: string, token: string): Promise<void>;
}
