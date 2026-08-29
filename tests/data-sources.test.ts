import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/trpc", () => ({
  apiTrpcClient: {
    participation: {
      current: {
        query: vi.fn(),
      },
      checkIn: {
        mutate: vi.fn(),
      },
      checkOut: {
        mutate: vi.fn(),
      },
    },
    storage: {
      createUploadUrl: {
        mutate: vi.fn(),
      },
      discardUpload: {
        mutate: vi.fn(),
      },
    },
    posts: {
      listCurrentTopic: {
        query: vi.fn(),
      },
      myCurrent: {
        query: vi.fn(),
      },
      comments: {
        query: vi.fn(),
      },
      createComment: {
        mutate: vi.fn(),
      },
    },
    topics: {
      list: {
        query: vi.fn(),
      },
    },
    follow: {
      setFollowing: {
        mutate: vi.fn(),
      },
    },
    chat: {
      list: {
        query: vi.fn(),
      },
      messages: {
        query: vi.fn(),
      },
      sendMessage: {
        mutate: vi.fn(),
      },
    },
  },
}));

import { mockDataSources } from "../lib/data/mock-data-source";
import { createServerDataSources } from "../lib/data/server-data-source";
import type {
  AppChatListItem,
  AppChatMessage,
  AppChatMessages,
  AppMyPost,
  AppPost,
  AppTopic,
  CheckInParticipationInput,
  CreateUploadUrlResponse,
  CurrentParticipation,
  SetFollowingResponse,
} from "../lib/data/types";

function createCurrentParticipation(): CurrentParticipation {
  return {
    participation: null,
    topic: null,
    post: null,
    expiresAt: null,
    serverNow: "2026-07-09T00:00:00.000Z",
  };
}

function createPostDependencies() {
  return {
    getTopics: vi.fn().mockResolvedValue([] satisfies AppTopic[]),
    getPosts: vi.fn().mockResolvedValue([] satisfies AppPost[]),
    getMyPost: vi.fn().mockResolvedValue({
      imageUri: null,
      caption: "",
      postedAt: "",
      topicLabel: "",
    } satisfies AppMyPost),
    setFollowing: vi.fn().mockResolvedValue({
      targetUserId: "2",
      followState: "following",
    } satisfies SetFollowingResponse),
    getChatList: vi.fn().mockResolvedValue([] satisfies AppChatListItem[]),
    getChatMessages: vi.fn().mockResolvedValue({
      targetUser: { id: "2", name: "user_2" },
      messages: [],
    } satisfies AppChatMessages),
    sendChatMessage: vi.fn().mockResolvedValue({
      id: "1",
      senderId: "me",
      text: "hello",
    } satisfies AppChatMessage),
    listPostComments: vi.fn().mockResolvedValue([]),
    createPostComment: vi.fn(),
  };
}

describe("participation data sources", () => {
  const checkInInput: CheckInParticipationInput = {
    topicId: 1,
    imageStorageKey: "users/1/posts/test.png",
    caption: "赤いもの",
    location: {
      latitude: 35.6595,
      longitude: 139.7005,
      accuracy: 20,
    },
  };

  it("returns an empty current participation from the mock source", async () => {
    const result = await mockDataSources.participation.getCurrent();

    expect(result).toMatchObject({
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
    });
    expect(new Date(result.serverNow).toISOString()).toBe(result.serverNow);
  });

  it("returns mock topics from the mock source", async () => {
    const result = await mockDataSources.topics.getAll();

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({
      id: expect.any(String),
      startAt: expect.any(String),
      dateLabel: expect.any(String),
      location: expect.any(String),
      lat: expect.any(Number),
      lng: expect.any(Number),
      items: expect.any(String),
    });
  });

  it("delegates topic retrieval to the server client", async () => {
    const topics: AppTopic[] = [
      {
        id: "1",
        startAt: "2026-07-09T15:39:01.000Z",
        dateLabel: "2026/07/10（金）00:39",
        location: "杉並区阿佐谷南3丁目付近",
        lat: 35.7030952,
        lng: 139.6301901,
        items: "赤いもの",
        locationRequired: true,
      },
    ];
    const current = createCurrentParticipation();
    const getTopics = vi.fn().mockResolvedValue(topics);
    const sources = createServerDataSources({
      getTopics,
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl: vi.fn(),
      getPosts: vi.fn(),
      getMyPost: vi.fn(),
      setFollowing: vi.fn(),
      getChatList: vi.fn(),
      getChatMessages: vi.fn(),
      sendChatMessage: vi.fn(),
      listPostComments: vi.fn(),
      createPostComment: vi.fn(),
    });

    await expect(sources.topics.getAll()).resolves.toBe(topics);
    expect(getTopics).toHaveBeenCalledOnce();
  });

  it("delegates current participation retrieval to the server client", async () => {
    const current = createCurrentParticipation();
    const getCurrent = vi.fn().mockResolvedValue(current);
    const checkOut = vi.fn().mockResolvedValue(current);
    const sources = createServerDataSources({
      getCurrentParticipation: getCurrent,
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: checkOut,
      createUploadUrl: vi.fn(),
      ...createPostDependencies(),
    });

    await expect(sources.participation.getCurrent()).resolves.toBe(current);
    expect(getCurrent).toHaveBeenCalledOnce();
  });

  it("returns an active current participation after mock check-in", async () => {
    const result = await mockDataSources.participation.checkIn(checkInInput);

    expect(result).toMatchObject({
      participation: {
        userId: 1,
        topicId: checkInInput.topicId,
        status: "active",
      },
      topic: {
        id: checkInInput.topicId,
        latitude: checkInInput.location?.latitude,
        longitude: checkInInput.location?.longitude,
      },
      post: {
        imageStorageKey: checkInInput.imageStorageKey,
        caption: checkInInput.caption,
      },
    });
    expect(new Date(result.serverNow).toISOString()).toBe(result.serverNow);
    expect(new Date(result.expiresAt ?? "").toISOString()).toBe(
      result.expiresAt,
    );
  });

  it("delegates check-in to the server client", async () => {
    const current = createCurrentParticipation();
    const checkIn = vi.fn().mockResolvedValue(current);
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: checkIn,
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl: vi.fn(),
      ...createPostDependencies(),
    });

    await expect(sources.participation.checkIn(checkInInput)).resolves.toBe(
      current,
    );
    expect(checkIn).toHaveBeenCalledWith(checkInInput);
  });

  it("returns an empty current participation after mock checkout", async () => {
    const result = await mockDataSources.participation.checkOut();

    expect(result).toMatchObject({
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
    });
  });

  it("delegates checkout to the server client", async () => {
    const current = createCurrentParticipation();
    const getCurrent = vi.fn().mockResolvedValue(current);
    const checkOut = vi.fn().mockResolvedValue(current);
    const sources = createServerDataSources({
      getCurrentParticipation: getCurrent,
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: checkOut,
      createUploadUrl: vi.fn(),
      ...createPostDependencies(),
    });

    await expect(sources.participation.checkOut()).resolves.toBe(current);
    expect(checkOut).toHaveBeenCalledOnce();
  });

  it("returns a mock upload URL target", async () => {
    const result = await mockDataSources.storage.createUploadUrl({
      contentType: "image/png",
      contentLength: 70,
    });

    expect(result).toMatchObject({
      imageStorageKey: "mock/users/1/posts/mock-upload.png",
      uploadUrl: "mock://storage/upload",
    });
    expect(new Date(result.expiresAt).toISOString()).toBe(result.expiresAt);
  });

  it("delegates upload URL creation to the server client", async () => {
    const uploadTarget: CreateUploadUrlResponse = {
      imageStorageKey: "users/1/posts/test.jpg",
      uploadUrl: "https://example.test/upload",
      expiresAt: "2026-07-09T00:05:00.000Z",
    };
    const current = createCurrentParticipation();
    const createUploadUrl = vi.fn().mockResolvedValue(uploadTarget);
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl,
      ...createPostDependencies(),
    });
    const input = {
      contentType: "image/jpeg" as const,
      contentLength: 1024,
    };

    await expect(sources.storage.createUploadUrl(input)).resolves.toBe(
      uploadTarget,
    );
    expect(createUploadUrl).toHaveBeenCalledWith(input);
  });

  it("returns a mock discard upload response", async () => {
    await expect(
      mockDataSources.storage.discardUpload({
        imageStorageKey: "mock/users/1/posts/mock-upload.png",
      }),
    ).resolves.toEqual({ discarded: true });
  });

  it("delegates upload discard to the server client", async () => {
    const current = createCurrentParticipation();
    const discardUpload = vi.fn().mockResolvedValue({ discarded: true });
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl: vi.fn(),
      discardUpload,
      ...createPostDependencies(),
    });
    const input = { imageStorageKey: "users/1/posts/orphan.png" };

    await expect(sources.storage.discardUpload(input)).resolves.toEqual({
      discarded: true,
    });
    expect(discardUpload).toHaveBeenCalledWith(input);
  });

  it("returns mock posts from the mock source", async () => {
    const result = await mockDataSources.posts.getAll();

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({
      id: expect.any(String),
      imageUri: expect.any(String),
      user: {
        id: expect.any(String),
        name: expect.any(String),
      },
    });
  });

  it("delegates post retrieval to the server client", async () => {
    const posts: AppPost[] = [
      {
        id: "1",
        user: { id: "1", name: "test", followState: "none", isMine: true },
        imageUri: "https://example.test/image.jpg",
        caption: "caption",
        topicId: "1",
      },
    ];
    const current = createCurrentParticipation();
    const getPosts = vi.fn().mockResolvedValue(posts);
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl: vi.fn(),
      getTopics: vi.fn(),
      getPosts,
      getMyPost: vi.fn(),
      setFollowing: vi.fn(),
      getChatList: vi.fn(),
      getChatMessages: vi.fn(),
      sendChatMessage: vi.fn(),
      listPostComments: vi.fn(),
      createPostComment: vi.fn(),
    });

    await expect(sources.posts.getAll()).resolves.toBe(posts);
    expect(getPosts).toHaveBeenCalledOnce();
  });

  it("delegates my post retrieval to the server client", async () => {
    const myPost: AppMyPost = {
      imageUri: "https://example.test/image.jpg",
      caption: "caption",
      postedAt: "2026-07-09T00:00:00.000Z",
      topicLabel: "topic",
    };
    const current = createCurrentParticipation();
    const getMyPost = vi.fn().mockResolvedValue(myPost);
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl: vi.fn(),
      getTopics: vi.fn(),
      getPosts: vi.fn(),
      getMyPost,
      setFollowing: vi.fn(),
      getChatList: vi.fn(),
      getChatMessages: vi.fn(),
      sendChatMessage: vi.fn(),
      listPostComments: vi.fn(),
      createPostComment: vi.fn(),
    });

    await expect(sources.posts.getMyPost()).resolves.toBe(myPost);
    expect(getMyPost).toHaveBeenCalledOnce();
  });

  it("delegates follow updates to the server client", async () => {
    const current = createCurrentParticipation();
    const response: SetFollowingResponse = {
      targetUserId: "2",
      followState: "following",
    };
    const setFollowing = vi.fn().mockResolvedValue(response);
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl: vi.fn(),
      getTopics: vi.fn(),
      getPosts: vi.fn(),
      getMyPost: vi.fn(),
      setFollowing,
      getChatList: vi.fn(),
      getChatMessages: vi.fn(),
      sendChatMessage: vi.fn(),
      listPostComments: vi.fn(),
      createPostComment: vi.fn(),
    });
    const input = { targetUserId: "2", following: true };

    await expect(sources.follow.setFollowing(input)).resolves.toBe(response);
    expect(setFollowing).toHaveBeenCalledWith(input);
  });

  it("returns mock chat list from the mock source", async () => {
    const result = await mockDataSources.chat.list();

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      lastMessage: expect.any(String),
      hasUnread: expect.any(Boolean),
    });
  });

  it("delegates chat list retrieval to the server client", async () => {
    const current = createCurrentParticipation();
    const chatUsers: AppChatListItem[] = [
      {
        id: "2",
        name: "follow_user_2",
        imageUri: "https://example.test/image.jpg",
        lastMessage: "hello",
        hasUnread: false,
      },
    ];
    const getChatList = vi.fn().mockResolvedValue(chatUsers);
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl: vi.fn(),
      ...createPostDependencies(),
      getChatList,
    });

    await expect(sources.chat.list()).resolves.toBe(chatUsers);
    expect(getChatList).toHaveBeenCalledOnce();
  });

  it("delegates chat message retrieval to the server client", async () => {
    const current = createCurrentParticipation();
    const messages: AppChatMessages = {
      targetUser: { id: "2", name: "follow_user_2" },
      messages: [{ id: "1", senderId: "me", text: "hello" }],
    };
    const getChatMessages = vi.fn().mockResolvedValue(messages);
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl: vi.fn(),
      ...createPostDependencies(),
      getChatMessages,
    });

    await expect(sources.chat.messages({ targetUserId: "2" })).resolves.toBe(
      messages,
    );
    expect(getChatMessages).toHaveBeenCalledWith({ targetUserId: "2" });
  });

  it("delegates chat message sending to the server client", async () => {
    const current = createCurrentParticipation();
    const message: AppChatMessage = { id: "1", senderId: "me", text: "hello" };
    const sendChatMessage = vi.fn().mockResolvedValue(message);
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl: vi.fn(),
      ...createPostDependencies(),
      sendChatMessage,
    });
    const input = { targetUserId: "2", body: "hello" };

    await expect(sources.chat.sendMessage(input)).resolves.toBe(message);
    expect(sendChatMessage).toHaveBeenCalledWith(input);
  });

  it("returns mock comments for a Post", async () => {
    const result = await mockDataSources.postComments.list({ postId: "p1" });

    expect(result[0]).toMatchObject({
      id: expect.any(String),
      postId: "p1",
      user: {
        id: expect.any(String),
        name: expect.any(String),
        isMine: expect.any(Boolean),
      },
      body: expect.any(String),
      createdAt: expect.any(String),
    });
  });

  it("preserves whitespace when creating a mock comment", async () => {
    const result = await mockDataSources.postComments.create({
      postId: "mock-whitespace-post",
      body: "  hello  ",
    });

    expect(result.body).toBe("  hello  ");
  });

  it("maps server comment IDs to strings", async () => {
    const listPostComments = vi.fn().mockResolvedValue([
      {
        id: 7,
        postId: 11,
        user: { id: 2, name: "hana", isMine: false },
        body: "hello",
        createdAt: "2026-08-29T00:00:00.000Z",
      },
    ]);
    const sources = createServerDataSources({
      getCurrentParticipation: vi
        .fn()
        .mockResolvedValue(createCurrentParticipation()),
      checkInParticipation: vi.fn(),
      checkOutParticipation: vi.fn(),
      createUploadUrl: vi.fn(),
      ...createPostDependencies(),
      listPostComments,
      createPostComment: vi.fn(),
    });

    await expect(sources.postComments.list({ postId: "11" })).resolves.toEqual([
      {
        id: "7",
        postId: "11",
        user: { id: "2", name: "hana", isMine: false },
        body: "hello",
        createdAt: "2026-08-29T00:00:00.000Z",
      },
    ]);
    expect(listPostComments).toHaveBeenCalledWith({ postId: 11 });
  });

  it("passes the original body to the server comment mutation", async () => {
    const createPostComment = vi.fn().mockResolvedValue({
      id: 8,
      postId: 11,
      user: { id: 1, name: "me", isMine: true },
      body: "  hello  ",
      createdAt: "2026-08-29T00:01:00.000Z",
    });
    const sources = createServerDataSources({
      getCurrentParticipation: vi
        .fn()
        .mockResolvedValue(createCurrentParticipation()),
      checkInParticipation: vi.fn(),
      checkOutParticipation: vi.fn(),
      createUploadUrl: vi.fn(),
      ...createPostDependencies(),
      listPostComments: vi.fn(),
      createPostComment,
    });

    await expect(
      sources.postComments.create({ postId: "11", body: "  hello  " }),
    ).resolves.toMatchObject({ id: "8", body: "  hello  " });
    expect(createPostComment).toHaveBeenCalledWith({
      postId: 11,
      body: "  hello  ",
    });
  });
});
