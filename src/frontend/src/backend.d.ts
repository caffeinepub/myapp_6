import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Message {
    id: bigint;
    text: string;
    senderUsername: string;
    isRead: boolean;
    timestamp: bigint;
    recipientUsername: string;
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
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    banWithToken(serial: bigint, days: bigint, token: string): Promise<void>;
    enhanceWithToken(serial: bigint, amount: bigint, token: string): Promise<void>;
    getAllConversationsWithToken(token: string): Promise<Array<ConversationSummary>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getConversationWithToken(otherUsername: string, token: string): Promise<Array<Message>>;
    getLatestUnreadMessageSenderWithToken(token: string): Promise<string | null>;
    getMyBucksBalanceWithToken(token: string): Promise<bigint>;
    getUnreadMessageCountWithToken(token: string): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserProfileByUsername(username: string): Promise<UserProfile>;
    isCallerAdmin(): Promise<boolean>;
    loginWithToken(username: string, passwordHash: string, sessionToken: string): Promise<UserProfile>;
    logoutToken(sessionToken: string): Promise<void>;
    markMessageAsReadWithToken(messageId: bigint, token: string): Promise<void>;
    registerWithToken(username: string, passwordHash: string, displayName: string, sessionToken: string): Promise<bigint>;
    saveCallerUserProfile(arg0: UserProfile): Promise<void>;
    searchBySerial(serial: bigint): Promise<{
        username: string;
        displayName: string;
    }>;
    sendMessageWithToken(recipientUsername: string, text: string, token: string): Promise<void>;
    terminateWithToken(serial: bigint, token: string): Promise<void>;
    unbanWithToken(serial: bigint, token: string): Promise<void>;
    updateDisplayNameWithToken(newDisplayName: string, token: string): Promise<void>;
    updatePasswordWithToken(currentPasswordHash: string, newPasswordHash: string, token: string): Promise<void>;
    updateUsernameWithToken(newUsername: string, token: string): Promise<void>;
}
