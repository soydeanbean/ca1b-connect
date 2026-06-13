// src/types/Chat.ts

export type ChatType = "group" | "private";

export type ChatMessage = {
  id: string;
  threadId: string;
  senderUid: string;
  senderName: string;
  senderPhotoURL: string;
  text: string;
  pinned: boolean;
  createdAt: unknown;
};

export type ChatThread = {
  id: string;
  type: ChatType;
  /** For private chats: the other participant's uid */
  participantUid: string | null;
  participantName: string;
  participantPhotoURL: string;
  lastMessage: string;
  lastMessageAt: unknown;
  lastSenderName: string;
  /** Number of messages in this thread (for FIFO prune) */
  messageCount: number;
};