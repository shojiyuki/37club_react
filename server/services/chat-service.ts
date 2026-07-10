import type {
  ChatMessageRecord,
  ChatRepository,
  ChatUserRecord,
} from "../repositories/chat-repository";
import type { Storage } from "../storage/storage";

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;
const MAX_MESSAGE_BODY_LENGTH = 1000;

export type ChatListItemResponse = {
  userId: number;
  userName: string;
  imageUrl: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  hasUnread: boolean;
};

export type ChatMessageResponse = {
  id: number;
  senderUserId: number;
  isMine: boolean;
  body: string;
  createdAt: string;
};

export type ChatMessagesResponse = {
  targetUser: {
    id: number;
    name: string;
  };
  messages: ChatMessageResponse[];
};

export type SendChatMessageResponse = {
  message: ChatMessageResponse;
};

export type ChatServiceErrorCode =
  | "CANNOT_CHAT_SELF"
  | "USER_NOT_FOUND"
  | "NOT_MUTUAL"
  | "EMPTY_MESSAGE"
  | "MESSAGE_TOO_LONG";

export class ChatServiceError extends Error {
  constructor(readonly code: ChatServiceErrorCode) {
    super(code);
  }
}

export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly storage: Storage | null = null,
  ) {}

  async list(viewerUserId: number): Promise<ChatListItemResponse[]> {
    const users = await this.repository.listMutualUsers(viewerUserId);

    return Promise.all(
      users.map(async (user) => {
        const roomId = await this.repository.findRoomIdForUsers(viewerUserId, user.id);
        const latestMessage = roomId ? await this.repository.findLatestMessage(roomId) : undefined;
        const imageStorageKey = await this.repository.findLatestPostImageStorageKey(user.id);

        return {
          userId: user.id,
          userName: toUserName(user),
          imageUrl: imageStorageKey ? await this.createReadUrl(imageStorageKey) : null,
          lastMessage: latestMessage ? toLastMessageText(viewerUserId, latestMessage) : "",
          lastMessageAt: latestMessage?.createdAt.toISOString() ?? null,
          hasUnread: false,
        };
      }),
    );
  }

  async messages(
    viewerUserId: number,
    input: { targetUserId: number; limit?: number },
  ): Promise<ChatMessagesResponse> {
    const targetUser = await this.validateChatTarget(viewerUserId, input.targetUserId);
    const roomId = await this.repository.findRoomIdForUsers(viewerUserId, input.targetUserId);
    const limit = normalizeLimit(input.limit);
    const messages = roomId ? await this.repository.listMessages(roomId, limit) : [];

    return {
      targetUser: {
        id: targetUser.id,
        name: toUserName(targetUser),
      },
      messages: messages.map((message) => toMessageResponse(viewerUserId, message)),
    };
  }

  async sendMessage(
    viewerUserId: number,
    input: { targetUserId: number; body: string },
  ): Promise<SendChatMessageResponse> {
    await this.validateChatTarget(viewerUserId, input.targetUserId);
    const body = normalizeBody(input.body);

    let roomId = await this.repository.findRoomIdForUsers(viewerUserId, input.targetUserId);
    if (!roomId) {
      roomId = await this.repository.createRoomForUsers(viewerUserId, input.targetUserId);
    }

    const message = await this.repository.insertMessage(roomId, viewerUserId, body);
    return {
      message: toMessageResponse(viewerUserId, message),
    };
  }

  private async validateChatTarget(viewerUserId: number, targetUserId: number): Promise<ChatUserRecord> {
    if (viewerUserId === targetUserId) {
      throw new ChatServiceError("CANNOT_CHAT_SELF");
    }

    const targetUser = await this.repository.findUserById(targetUserId);
    if (!targetUser) {
      throw new ChatServiceError("USER_NOT_FOUND");
    }

    if (!(await this.repository.areMutual(viewerUserId, targetUserId))) {
      throw new ChatServiceError("NOT_MUTUAL");
    }

    return targetUser;
  }

  private async createReadUrl(imageStorageKey: string): Promise<string | null> {
    if (!this.storage) return null;
    return this.storage.createReadUrl(imageStorageKey);
  }
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit) return DEFAULT_MESSAGE_LIMIT;
  return Math.min(Math.max(limit, 1), MAX_MESSAGE_LIMIT);
}

function normalizeBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new ChatServiceError("EMPTY_MESSAGE");
  }
  if (trimmed.length > MAX_MESSAGE_BODY_LENGTH) {
    throw new ChatServiceError("MESSAGE_TOO_LONG");
  }
  return trimmed;
}

function toUserName(user: ChatUserRecord): string {
  return user.name ?? `user_${user.id}`;
}

function toMessageResponse(viewerUserId: number, message: ChatMessageRecord): ChatMessageResponse {
  return {
    id: message.id,
    senderUserId: message.senderUserId,
    isMine: message.senderUserId === viewerUserId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

function toLastMessageText(viewerUserId: number, message: ChatMessageRecord): string {
  return message.senderUserId === viewerUserId ? `あなた: ${message.body}` : message.body;
}
