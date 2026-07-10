import { describe, expect, it, vi } from "vitest";

import type {
  CurrentTopicPostRecord,
  MyCurrentPostRecord,
  PostsRepository,
} from "../server/repositories/posts-repository";
import type { FollowRepository } from "../server/repositories/follow-repository";
import { PostsService } from "../server/services/posts-service";
import type { Storage } from "../server/storage/storage";

const NOW = new Date("2026-07-09T15:52:04.000Z");

function createRepository(overrides: Partial<PostsRepository> = {}): PostsRepository {
  return {
    findActiveTopicIdByUserId: vi.fn(),
    findCurrentTopicPosts: vi.fn().mockResolvedValue([]),
    findMyCurrentPost: vi.fn().mockResolvedValue(undefined),
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

function createFollowRepository(overrides: Partial<FollowRepository> = {}): FollowRepository {
  return {
    userExists: vi.fn(),
    isFollowing: vi.fn().mockResolvedValue(false),
    follow: vi.fn(),
    unfollow: vi.fn(),
    ...overrides,
  };
}

function createPostRecord(
  overrides: {
    post?: Partial<CurrentTopicPostRecord["post"]>;
    user?: Partial<CurrentTopicPostRecord["user"]>;
    topic?: Partial<CurrentTopicPostRecord["topic"]>;
  } = {},
): CurrentTopicPostRecord {
  return {
    post: {
      id: 11,
      userId: 1,
      topicId: 1,
      imageStorageKey: "users/1/posts/photo.png",
      caption: "赤いもの",
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides.post,
    },
    user: {
      id: 1,
      openId: "open-1",
      name: "shoji",
      email: "shoji@example.test",
      loginMethod: "test",
      role: "user",
      createdAt: NOW,
      updatedAt: NOW,
      lastSignedIn: NOW,
      ...overrides.user,
    },
    topic: {
      id: 1,
      startAt: NOW,
      endAt: new Date("2026-07-09T16:16:01.000Z"),
      locationName: "杉並区阿佐谷南3丁目付近",
      latitude: 35.7030952,
      longitude: 139.6301901,
      prompt: "赤いもの",
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides.topic,
    },
  };
}

function createMyPostRecord(): MyCurrentPostRecord {
  const record = createPostRecord();
  return {
    participation: {
      id: 9,
      userId: 1,
      topicId: 1,
      postId: 11,
      status: "active",
      checkedInAt: NOW,
      checkedOutAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    post: record.post,
    topic: record.topic,
  };
}

describe("PostsService", () => {
  it("returns current topic posts with signed read URLs and none follow state", async () => {
    const repository = createRepository({
      findCurrentTopicPosts: vi.fn().mockResolvedValue([
        createPostRecord({ user: { id: 2, name: "hana" } }),
      ]),
    });
    const storage = createStorage();
    const followRepository = createFollowRepository();
    const service = new PostsService(repository, storage, followRepository);

    const result = await service.listCurrentTopicPosts(1);

    expect(result).toEqual([
      {
        id: "11",
        user: {
          id: "2",
          name: "hana",
          followState: "none",
          isMine: false,
        },
        imageUri: "https://example.test/users/1/posts/photo.png",
        caption: "赤いもの",
        topicId: "1",
      },
    ]);
    expect(storage.createReadUrl).toHaveBeenCalledWith("users/1/posts/photo.png");
    expect(followRepository.isFollowing).toHaveBeenCalledWith(1, 2);
  });

  it("returns following when viewer follows the post author", async () => {
    const repository = createRepository({
      findCurrentTopicPosts: vi.fn().mockResolvedValue([
        createPostRecord({ user: { id: 2, name: "hana" } }),
      ]),
    });
    const service = new PostsService(
      repository,
      createStorage(),
      createFollowRepository({
        isFollowing: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      }),
    );

    const result = await service.listCurrentTopicPosts(1);

    expect(result[0]?.user.followState).toBe("following");
    expect(result[0]?.user.isMine).toBe(false);
  });

  it("returns mutual when viewer and post author follow each other", async () => {
    const repository = createRepository({
      findCurrentTopicPosts: vi.fn().mockResolvedValue([
        createPostRecord({ user: { id: 2, name: "hana" } }),
      ]),
    });
    const service = new PostsService(
      repository,
      createStorage(),
      createFollowRepository({
        isFollowing: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(true),
      }),
    );

    const result = await service.listCurrentTopicPosts(1);

    expect(result[0]?.user.followState).toBe("mutual");
    expect(result[0]?.user.isMine).toBe(false);
  });

  it("returns none for viewer's own post without checking follow relations", async () => {
    const repository = createRepository({
      findCurrentTopicPosts: vi.fn().mockResolvedValue([createPostRecord()]),
    });
    const followRepository = createFollowRepository();
    const service = new PostsService(repository, createStorage(), followRepository);

    const result = await service.listCurrentTopicPosts(1);

    expect(result[0]?.user.followState).toBe("none");
    expect(result[0]?.user.isMine).toBe(true);
    expect(followRepository.isFollowing).not.toHaveBeenCalled();
  });

  it("returns my active post with topic label and signed read URL", async () => {
    const repository = createRepository({
      findMyCurrentPost: vi.fn().mockResolvedValue(createMyPostRecord()),
    });
    const storage = createStorage();
    const service = new PostsService(repository, storage);

    const result = await service.getMyCurrentPost(1);

    expect(result).toEqual({
      imageUri: "https://example.test/users/1/posts/photo.png",
      caption: "赤いもの",
      postedAt: "2026-07-09T15:52:04.000Z",
      topicLabel: "杉並区阿佐谷南3丁目付近",
    });
  });

  it("returns an empty my post when there is no active participation", async () => {
    const service = new PostsService(createRepository(), createStorage());

    await expect(service.getMyCurrentPost(1)).resolves.toEqual({
      imageUri: null,
      caption: "",
      postedAt: "",
      topicLabel: "",
    });
  });
});
