import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ConversationSummary, Message } from "../backend.d";
import { useApp } from "../context/AppContext";
import { useActor } from "./useActor";

export function useConversations() {
  const { actor, isFetching } = useActor();
  const { sessionToken } = useApp();
  return useQuery<ConversationSummary[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllConversationsWithToken(sessionToken);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useConversation(otherUsername: string | null) {
  const { actor, isFetching } = useActor();
  const { sessionToken } = useApp();
  return useQuery<Message[]>({
    queryKey: ["conversation", otherUsername],
    queryFn: async () => {
      if (!actor || !otherUsername) return [];
      return actor.getConversationWithToken(otherUsername, sessionToken);
    },
    enabled: !!actor && !isFetching && !!otherUsername,
    refetchInterval: 5000,
  });
}

export function useUnreadCount() {
  const { actor, isFetching } = useActor();
  const { sessionToken } = useApp();
  return useQuery<bigint>({
    queryKey: ["unreadCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getUnreadMessageCountWithToken(sessionToken);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useLatestUnreadSender() {
  const { actor, isFetching } = useActor();
  const { sessionToken } = useApp();
  return useQuery<string | null>({
    queryKey: ["latestUnreadSender"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getLatestUnreadMessageSenderWithToken(sessionToken);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useMyBucksBalance() {
  const { actor, isFetching } = useActor();
  const { sessionToken } = useApp();
  return useQuery<bigint>({
    queryKey: ["myBucksBalance"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getMyBucksBalanceWithToken(sessionToken);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useSearchBySerial() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serial: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.searchBySerial(serial);
    },
    onSuccess: (data, serial) => {
      queryClient.setQueryData(["search", serial.toString()], data);
    },
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const { sessionToken } = useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipientUsername,
      text,
    }: {
      recipientUsername: string;
      text: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      await actor.sendMessageWithToken(recipientUsername, text, sessionToken);
    },
    onSuccess: (_, { recipientUsername }) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", recipientUsername],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkAsRead() {
  const { actor } = useActor();
  const { sessionToken } = useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.markMessageAsReadWithToken(messageId, sessionToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      queryClient.invalidateQueries({ queryKey: ["latestUnreadSender"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
