import { describe, expect, it, vi } from "vitest";

import type {
  ChatMessageRecord,
  ChatRepository,
  ChatUserRecord,
} from "../server/repositories/chat-repository";
import { ChatService, ChatServiceError } from "../server/services/chat-service";
import type { Storage } from "../server/storage/storage";

const NOW = new Date("2026-07-10T06:32:39.000Z");

function createUser(overrides: Partial<ChatUserRecord> = {}): ChatUserRecord {
  return {
    id: 2,
    openId: "open-2",
    name: "follow_user_2",
    email: "follow_user_2@example.test",
    loginMethod: "local",
    role: "user",
    createdAt: NOW,
    updatedAt: NOW,
    lastSignedIn: NOW,
    ...overrides,
  };
}

function createMessage(overrides: Partial<ChatMessageRecord> = {}): ChatMessageRecord {
  return {
    id: 10,
    chatRoomId: 5,
    senderUserId: 2,
    body: "hello",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function createRepository(overrides: Partial<ChatRepository> = {}): ChatRepository {
  return {
    userExists: vi.fn().mockResolvedValue(true),
    findUserById: vi.fn().mockResolvedValue(createUser()),
    listMutualUsers: vi.fn().mockResolvedValue([]),
    areMutual: vi.fn().mockResolvedValue(true),
    areActiveInSameTopic: vi.fn().mockResolvedValue(true),
    findLatestPostImageStorageKey: vi.fn().mockResolvedValue(null),
    findRoomIdForUsers: vi.fn().mockResolvedValue(undefined),
    createRoomForUsers: vi.fn().mockResolvedValue(5),
    listMessages: vi.fn().mockResolvedValue([]),
    findLatestMessage: vi.fn().mockResolvedValue(undefined),
    insertMessage: vi.fn().mockResolvedValue(createMessage({ senderUserId: 1, body: "hello" })),
    ...overrides,
  };
}

function createStorage(): Storage {
  return {
    createUploadUrl: vi.fn(),
    createReadUrl: vi.fn(async (key: string) => `https://example.test/${key}`),
    getObjectMetadata: vi.fn(),
    deleteObject: vi.fn(),
  };
}

describe("ChatService", () => {
  it("lists mutual users with latest message and post image", async () => {
    const repository = createRepository({
      listMutualUsers: vi.fn().mockResolvedValue([createUser({ id: 2, name: "hana" })]),
      findRoomIdForUsers: vi.fn().mockResolvedValue(5),
      findLatestMessage: vi.fn().mockResolvedValue(createMessage({ senderUserId: 1, body: "またね" })),
      findLatestPostImageStorageKey: vi.fn().mockResolvedValue("users/2/posts/photo.png"),
    });
    const storage = createStorage();
    const service = new ChatService(repository, storage);

    await expect(service.list(1)).resolves.toEqual([
      {
        userId: 2,
        userName: "hana",
        imageUrl: "https://example.test/users/2/posts/photo.png",
        lastMessage: "あなた: またね",
        lastMessageAt: "2026-07-10T06:32:39.000Z",
        hasUnread: false,
      },
    ]);
  });

  it("returns messages with target user information", async () => {
    const repository = createRepository({
      findRoomIdForUsers: vi.fn().mockResolvedValue(5),
      listMessages: vi.fn().mockResolvedValue([
        createMessage({ id: 1, senderUserId: 2, body: "hello" }),
        createMessage({ id: 2, senderUserId: 1, body: "hi" }),
      ]),
    });
    const service = new ChatService(repository);

    await expect(service.messages(1, { targetUserId: 2 })).resolves.toEqual({
      targetUser: {
        id: 2,
        name: "follow_user_2",
      },
      messages: [
        {
          id: 1,
          senderUserId: 2,
          isMine: false,
          body: "hello",
          createdAt: "2026-07-10T06:32:39.000Z",
        },
        {
          id: 2,
          senderUserId: 1,
          isMine: true,
          body: "hi",
          createdAt: "2026-07-10T06:32:39.000Z",
        },
      ],
    });
  });

  it("creates a room and inserts a trimmed message", async () => {
    const repository = createRepository({
      findRoomIdForUsers: vi.fn().mockResolvedValue(undefined),
      createRoomForUsers: vi.fn().mockResolvedValue(7),
      insertMessage: vi.fn().mockResolvedValue(createMessage({ chatRoomId: 7, senderUserId: 1, body: "hello" })),
    });
    const service = new ChatService(repository);

    await expect(service.sendMessage(1, { targetUserId: 2, body: "  hello  " })).resolves.toEqual({
      message: {
        id: 10,
        senderUserId: 1,
        isMine: true,
        body: "hello",
        createdAt: "2026-07-10T06:32:39.000Z",
      },
    });
    expect(repository.createRoomForUsers).toHaveBeenCalledWith(1, 2);
    expect(repository.insertMessage).toHaveBeenCalledWith(7, 1, "hello");
  });

  it("rejects non-mutual chat access", async () => {
    const service = new ChatService(createRepository({ areMutual: vi.fn().mockResolvedValue(false) }));

    await expect(service.messages(1, { targetUserId: 2 })).rejects.toEqual(
      new ChatServiceError("NOT_MUTUAL"),
    );
  });

  it("rejects chat access when users are not active in the same topic", async () => {
    const service = new ChatService(
      createRepository({ areActiveInSameTopic: vi.fn().mockResolvedValue(false) }),
    );

    await expect(service.messages(1, { targetUserId: 2 })).rejects.toEqual(
      new ChatServiceError("NOT_ACTIVE_IN_SAME_TOPIC"),
    );
  });

  it("rejects sending a message when users are not active in the same topic", async () => {
    const repository = createRepository({ areActiveInSameTopic: vi.fn().mockResolvedValue(false) });
    const service = new ChatService(repository);

    await expect(service.sendMessage(1, { targetUserId: 2, body: "hello" })).rejects.toEqual(
      new ChatServiceError("NOT_ACTIVE_IN_SAME_TOPIC"),
    );
    expect(repository.insertMessage).not.toHaveBeenCalled();
  });

  it("rejects empty messages", async () => {
    const service = new ChatService(createRepository());

    await expect(service.sendMessage(1, { targetUserId: 2, body: "   " })).rejects.toEqual(
      new ChatServiceError("EMPTY_MESSAGE"),
    );
  });

  it("rejects chatting with yourself", async () => {
    const service = new ChatService(createRepository());

    await expect(service.messages(1, { targetUserId: 1 })).rejects.toEqual(
      new ChatServiceError("CANNOT_CHAT_SELF"),
    );
  });
});
