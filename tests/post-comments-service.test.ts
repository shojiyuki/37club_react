import { describe, expect, it, vi } from "vitest";

import type {
  AppReviewConfig,
  Participation,
  Post,
  Topic,
  User,
} from "../drizzle/schema";
import type { AppReviewConfigRepository } from "../server/repositories/app-review-config-repository";
import type { BlockRepository } from "../server/repositories/block-repository";
import type {
  ActiveParticipationRecord,
  ParticipationRepository,
} from "../server/repositories/participation-repository";
import type {
  PostCommentRecord,
  PostCommentsRepository,
} from "../server/repositories/post-comments-repository";
import {
  PostCommentsService,
  PostCommentsServiceError,
} from "../server/services/post-comments-service";

const NOW = new Date("2026-08-29T00:10:00.000Z");

function createPost(overrides: Partial<Post> = {}): Post {
  return {
    id: 11,
    userId: 2,
    topicId: 20,
    imageStorageKey: "users/2/posts/photo.jpg",
    caption: "red",
    hiddenAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function createActiveRecord(
  input: {
    topicId?: number;
    topicEndAt?: Date;
    checkedInAt?: Date;
  } = {},
): ActiveParticipationRecord {
  const topicId = input.topicId ?? 20;
  const checkedInAt = input.checkedInAt ?? new Date("2026-08-29T00:00:00.000Z");
  const participation: Participation = {
    id: 10,
    userId: 1,
    topicId,
    postId: 30,
    status: "active",
    checkedInAt,
    checkedOutAt: null,
    createdAt: checkedInAt,
    updatedAt: checkedInAt,
  };
  const topic: Topic = {
    id: topicId,
    startAt: checkedInAt,
    endAt: input.topicEndAt ?? new Date("2026-08-29T00:37:00.000Z"),
    locationName: "test",
    latitude: 35,
    longitude: 139,
    prompt: "red",
    createdAt: checkedInAt,
    updatedAt: checkedInAt,
  };

  return {
    participation,
    topic,
    post: createPost({ id: 30, userId: 1, topicId }),
  };
}

function createCommentRecord(
  input: {
    id?: number;
    postId?: number;
    userId?: number;
    body?: string;
  } = {},
): PostCommentRecord {
  const userId = input.userId ?? 2;
  const user: User = {
    id: userId,
    openId: null,
    name: `user_${userId}`,
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: NOW,
    updatedAt: NOW,
    lastSignedIn: NOW,
    suspendedAt: null,
    deletedAt: null,
  };
  return {
    comment: {
      id: input.id ?? 1,
      postId: input.postId ?? 11,
      userId,
      body: input.body ?? "hello",
      hiddenAt: null,
      createdAt: NOW,
    },
    user,
  };
}

function createCommentRepository(
  overrides: Partial<PostCommentsRepository> = {},
): PostCommentsRepository {
  return {
    findPostById: vi.fn().mockResolvedValue(createPost()),
    listByPostId: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    ...overrides,
  };
}

function createParticipationRepository(
  activeRecord: ActiveParticipationRecord | undefined,
): ParticipationRepository {
  return {
    findActiveByUserId: vi.fn().mockResolvedValue(activeRecord),
    findByUserIdAndTopicId: vi.fn(),
    findTopicById: vi.fn(),
    findPostByImageStorageKey: vi.fn(),
    createActiveParticipation: vi.fn(),
    reactivateParticipation: vi.fn(),
    markExpired: vi.fn(),
    markCheckedOut: vi.fn(),
  };
}

function createAppReviewConfig(
  overrides: Partial<AppReviewConfig> = {},
): AppReviewConfig {
  return {
    enabled: true,
    topicId: 4,
    expiresAt: new Date("2026-08-30T00:00:00.000Z"),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function createAppReviewConfigRepository(
  configs: AppReviewConfig[] = [],
): AppReviewConfigRepository {
  return {
    findAll: vi.fn().mockResolvedValue(configs),
    findByTopicId: vi
      .fn()
      .mockImplementation(async (topicId: number) =>
        configs.find((config) => config.topicId === topicId),
      ),
  };
}

function createBlockRepository(
  overrides: Partial<BlockRepository> = {},
): BlockRepository {
  return {
    findAvailableUserById: vi.fn(),
    findOutgoing: vi.fn(),
    listOutgoing: vi.fn().mockResolvedValue([]),
    listCounterpartyUserIds: vi.fn().mockResolvedValue([]),
    hasEitherDirection: vi.fn().mockResolvedValue(false),
    haveSharedChatRoom: vi.fn().mockResolvedValue(false),
    createAndRemoveFollows: vi.fn(),
    removeOutgoing: vi.fn(),
    ...overrides,
  };
}

function createService(
  input: {
    comments?: PostCommentsRepository;
    activeRecord?: ActiveParticipationRecord | null;
    appReviewConfigs?: AppReviewConfig[];
    blocks?: BlockRepository;
  } = {},
) {
  const activeRecord =
    input.activeRecord === null
      ? undefined
      : (input.activeRecord ?? createActiveRecord());
  const comments = input.comments ?? createCommentRepository();
  const participations = createParticipationRepository(activeRecord);
  const service = new PostCommentsService(
    comments,
    participations,
    createAppReviewConfigRepository(input.appReviewConfigs),
    input.blocks ?? createBlockRepository(),
    () => NOW,
  );
  return { comments, participations, service };
}

describe("PostCommentsService", () => {
  it("lists comments for an active participant in the same Topic", async () => {
    const comments = createCommentRepository({
      listByPostId: vi
        .fn()
        .mockResolvedValue([
          createCommentRecord({ id: 1, userId: 2, body: "first" }),
          createCommentRecord({ id: 2, userId: 1, body: "second" }),
        ]),
    });
    const { service } = createService({ comments });

    await expect(service.list(1, { postId: 11 })).resolves.toEqual([
      {
        id: 1,
        postId: 11,
        user: { id: 2, name: "user_2", isMine: false },
        body: "first",
        createdAt: "2026-08-29T00:10:00.000Z",
      },
      {
        id: 2,
        postId: 11,
        user: { id: 1, name: "user_1", isMine: true },
        body: "second",
        createdAt: "2026-08-29T00:10:00.000Z",
      },
    ]);
  });

  it("filters blocked comment authors from the list", async () => {
    const comments = createCommentRepository({
      listByPostId: vi
        .fn()
        .mockResolvedValue([
          createCommentRecord({ id: 1, userId: 2, body: "blocked" }),
          createCommentRecord({ id: 2, userId: 3, body: "visible" }),
        ]),
    });
    const blocks = createBlockRepository({
      listCounterpartyUserIds: vi.fn().mockResolvedValue([2]),
    });

    await expect(
      createService({ comments, blocks }).service.list(1, { postId: 11 }),
    ).resolves.toEqual([
      {
        id: 2,
        postId: 11,
        user: { id: 3, name: "user_3", isMine: false },
        body: "visible",
        createdAt: "2026-08-29T00:10:00.000Z",
      },
    ]);
  });

  it("stores the original body without trimming", async () => {
    const comments = createCommentRepository({
      create: vi
        .fn()
        .mockResolvedValue(
          createCommentRecord({ userId: 1, body: "  hello  " }),
        ),
    });
    const { service } = createService({ comments });

    await expect(
      service.create(1, { postId: 11, body: "  hello  " }),
    ).resolves.toMatchObject({ body: "  hello  " });
    expect(comments.create).toHaveBeenCalledWith({
      postId: 11,
      userId: 1,
      body: "  hello  ",
    });
  });

  it("rejects comment creation when either user has blocked the Post author", async () => {
    const comments = createCommentRepository({
      create: vi
        .fn()
        .mockResolvedValue(createCommentRecord({ userId: 1, body: "hello" })),
    });
    const blocks = createBlockRepository({
      hasEitherDirection: vi.fn().mockResolvedValue(true),
    });

    await expect(
      createService({ comments, blocks }).service.create(1, {
        postId: 11,
        body: "hello",
      }),
    ).rejects.toEqual(new PostCommentsServiceError("USER_BLOCKED"));
    expect(blocks.hasEitherDirection).toHaveBeenCalledWith(1, 2);
    expect(comments.create).not.toHaveBeenCalled();
  });

  it("rejects access without an active participation", async () => {
    const { service } = createService({ activeRecord: null });

    await expect(service.list(1, { postId: 11 })).rejects.toEqual(
      new PostCommentsServiceError("NO_ACTIVE_PARTICIPATION"),
    );
  });

  it("expires and rejects a participation at the Topic end", async () => {
    const { service, participations } = createService({
      activeRecord: createActiveRecord({ topicEndAt: NOW }),
    });

    await expect(service.list(1, { postId: 11 })).rejects.toEqual(
      new PostCommentsServiceError("PARTICIPATION_EXPIRED"),
    );
    expect(participations.markExpired).toHaveBeenCalledWith(10);
  });

  it("rejects a Post from another Topic", async () => {
    const comments = createCommentRepository({
      findPostById: vi.fn().mockResolvedValue(createPost({ topicId: 99 })),
    });

    await expect(
      createService({ comments }).service.list(1, { postId: 11 }),
    ).rejects.toEqual(new PostCommentsServiceError("POST_NOT_IN_ACTIVE_TOPIC"));
  });

  it("rejects a missing Post", async () => {
    const comments = createCommentRepository({
      findPostById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      createService({ comments }).service.list(1, { postId: 11 }),
    ).rejects.toEqual(new PostCommentsServiceError("POST_NOT_FOUND"));
  });

  it.each([
    [" \n ", "EMPTY_COMMENT"],
    ["a".repeat(201), "COMMENT_TOO_LONG"],
  ] as const)("rejects invalid body %#", async (body, code) => {
    await expect(
      createService().service.create(1, { postId: 11, body }),
    ).rejects.toEqual(new PostCommentsServiceError(code));
  });

  it("accepts exactly 200 characters", async () => {
    const body = "a".repeat(200);
    const comments = createCommentRepository({
      create: vi
        .fn()
        .mockResolvedValue(createCommentRecord({ userId: 1, body })),
    });

    await expect(
      createService({ comments }).service.create(1, { postId: 11, body }),
    ).resolves.toMatchObject({ body });
  });

  it("allows an enabled demo participation before 37 minutes", async () => {
    const activeRecord = createActiveRecord({ topicId: 4 });
    const comments = createCommentRepository({
      findPostById: vi.fn().mockResolvedValue(createPost({ topicId: 4 })),
    });
    const { service } = createService({
      activeRecord,
      appReviewConfigs: [createAppReviewConfig()],
      comments,
    });

    await expect(service.list(1, { postId: 11 })).resolves.toEqual([]);
  });

  it.each([
    [
      createAppReviewConfig({ enabled: false }),
      createActiveRecord({ topicId: 4 }),
    ],
    [
      createAppReviewConfig({ expiresAt: NOW }),
      createActiveRecord({ topicId: 4 }),
    ],
    [
      createAppReviewConfig(),
      createActiveRecord({
        topicId: 4,
        checkedInAt: new Date("2026-08-28T23:33:00.000Z"),
      }),
    ],
  ])(
    "expires an unavailable demo participation %#",
    async (config, activeRecord) => {
      const comments = createCommentRepository({
        findPostById: vi.fn().mockResolvedValue(createPost({ topicId: 4 })),
      });
      const { service, participations } = createService({
        activeRecord,
        appReviewConfigs: [config],
        comments,
      });

      await expect(service.list(1, { postId: 11 })).rejects.toEqual(
        new PostCommentsServiceError("PARTICIPATION_EXPIRED"),
      );
      expect(participations.markExpired).toHaveBeenCalledWith(10);
    },
  );
});
