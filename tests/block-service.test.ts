import { describe, expect, it, vi } from "vitest";

import type {
  AppReviewConfig,
  Participation,
  Post,
  Topic,
  User,
  UserBlock,
} from "../drizzle/schema";
import type { AppReviewConfigRepository } from "../server/repositories/app-review-config-repository";
import type {
  BlockedUserRecord,
  BlockRepository,
} from "../server/repositories/block-repository";
import type {
  ActiveParticipationRecord,
  ParticipationRepository,
} from "../server/repositories/participation-repository";
import {
  BlockService,
  BlockServiceError,
} from "../server/services/block-service";

const NOW = new Date("2026-08-29T00:10:00.000Z");
const THIRTY_SEVEN_MINUTES_AGO = new Date("2026-08-28T23:33:00.000Z");

function createUser(userId = 2, overrides: Partial<User> = {}): User {
  return {
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
    ...overrides,
  };
}

function createBlockedUserRecord(
  overrides: Partial<UserBlock> = {},
): BlockedUserRecord {
  const block: UserBlock = {
    id: 10,
    blockerUserId: 1,
    blockedUserId: 2,
    createdAt: NOW,
    ...overrides,
  };
  return {
    block,
    user: createUser(block.blockedUserId),
  };
}

function createActiveRecord(input: {
  userId: number;
  topicId: number;
  checkedInAt?: Date;
}): ActiveParticipationRecord {
  const checkedInAt = input.checkedInAt ?? NOW;
  const participation: Participation = {
    id: input.userId,
    userId: input.userId,
    topicId: input.topicId,
    postId: input.userId,
    status: "active",
    checkedInAt,
    checkedOutAt: null,
    createdAt: checkedInAt,
    updatedAt: checkedInAt,
  };
  const topic: Topic = {
    id: input.topicId,
    startAt: new Date("2026-08-28T00:00:00.000Z"),
    endAt: new Date("2026-08-30T00:00:00.000Z"),
    locationName: "test",
    latitude: 35,
    longitude: 139,
    prompt: "test prompt",
    createdAt: NOW,
    updatedAt: NOW,
  };
  const post: Post = {
    id: input.userId,
    userId: input.userId,
    topicId: input.topicId,
    imageStorageKey: `users/${input.userId}/posts/test.jpg`,
    caption: "test",
    hiddenAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
  return { participation, topic, post };
}

function createDemoConfig(input: { topicId: number }): AppReviewConfig {
  return {
    enabled: true,
    topicId: input.topicId,
    expiresAt: new Date("2026-08-30T00:00:00.000Z"),
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function createBlockRepository(
  overrides: Partial<BlockRepository> = {},
): BlockRepository {
  return {
    findAvailableUserById: vi.fn().mockResolvedValue(createUser()),
    findOutgoing: vi.fn().mockResolvedValue(undefined),
    listOutgoing: vi.fn().mockResolvedValue([]),
    listCounterpartyUserIds: vi.fn().mockResolvedValue([]),
    hasEitherDirection: vi.fn().mockResolvedValue(false),
    haveSharedChatRoom: vi.fn().mockResolvedValue(false),
    createAndRemoveFollows: vi
      .fn()
      .mockResolvedValue(createBlockedUserRecord()),
    removeOutgoing: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createParticipationRepository(
  records: Map<number, ActiveParticipationRecord>,
): ParticipationRepository {
  return {
    findActiveByUserId: vi
      .fn()
      .mockImplementation(async (userId: number) => records.get(userId)),
    findByUserIdAndTopicId: vi.fn(),
    findTopicById: vi.fn(),
    findPostByImageStorageKey: vi.fn(),
    createActiveParticipation: vi.fn(),
    reactivateParticipation: vi.fn(),
    markExpired: vi.fn(),
    markCheckedOut: vi.fn(),
  };
}

function createAppReviewConfigRepository(
  config: AppReviewConfig,
): AppReviewConfigRepository {
  return {
    findAll: vi.fn().mockResolvedValue([config]),
    findByTopicId: vi
      .fn()
      .mockImplementation(async (topicId: number) =>
        topicId === config.topicId ? config : undefined,
      ),
  };
}

function createBlockService(
  input: {
    blocks?: BlockRepository;
    sameTopic?: boolean;
    sharedRoom?: boolean;
    expiredDemo?: boolean;
  } = {},
): BlockService {
  const blocks = input.blocks ?? createBlockRepository();
  const firstTopicId = 4;
  const secondTopicId = input.sameTopic === false ? 5 : firstTopicId;
  const records = new Map<number, ActiveParticipationRecord>([
    [
      1,
      createActiveRecord({
        userId: 1,
        topicId: firstTopicId,
        checkedInAt: input.expiredDemo ? THIRTY_SEVEN_MINUTES_AGO : NOW,
      }),
    ],
    [2, createActiveRecord({ userId: 2, topicId: secondTopicId })],
  ]);
  vi.mocked(blocks.haveSharedChatRoom).mockResolvedValue(
    input.sharedRoom ?? false,
  );

  return new BlockService(
    blocks,
    createParticipationRepository(records),
    createAppReviewConfigRepository(createDemoConfig({ topicId: 4 })),
    () => NOW,
  );
}

describe("BlockService", () => {
  it("creates one block and removes both follow directions", async () => {
    const blocks = createBlockRepository();
    const service = createBlockService({ blocks });

    await expect(service.create(1, { targetUserId: 2 })).resolves.toMatchObject(
      {
        userId: 2,
        name: "user_2",
      },
    );
    expect(blocks.createAndRemoveFollows).toHaveBeenCalledWith(1, 2);
  });

  it("returns an existing outgoing block without creating another row", async () => {
    const existing = createBlockedUserRecord();
    const blocks = createBlockRepository({
      findOutgoing: vi.fn().mockResolvedValue(existing),
      findAvailableUserById: vi.fn().mockResolvedValue(undefined),
    });
    const service = createBlockService({ blocks });

    await expect(service.create(1, { targetUserId: 2 })).resolves.toMatchObject(
      {
        userId: 2,
      },
    );
    expect(blocks.createAndRemoveFollows).not.toHaveBeenCalled();
  });

  it("rejects self block", async () => {
    await expect(
      createBlockService().create(1, { targetUserId: 1 }),
    ).rejects.toEqual(new BlockServiceError("CANNOT_BLOCK_SELF"));
  });

  it("rejects unreachable users", async () => {
    await expect(
      createBlockService({ sameTopic: false, sharedRoom: false }).create(1, {
        targetUserId: 2,
      }),
    ).rejects.toEqual(new BlockServiceError("BLOCK_TARGET_NOT_ACCESSIBLE"));
  });

  it("rejects a missing target", async () => {
    const blocks = createBlockRepository({
      findAvailableUserById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      createBlockService({ blocks }).create(1, { targetUserId: 2 }),
    ).rejects.toEqual(new BlockServiceError("BLOCK_TARGET_NOT_FOUND"));
  });

  it("allows blocking a user from an existing shared chat room", async () => {
    const service = createBlockService({ sameTopic: false, sharedRoom: true });

    await expect(service.create(1, { targetUserId: 2 })).resolves.toMatchObject(
      {
        userId: 2,
      },
    );
  });

  it("rejects an expired demo participation without a shared room", async () => {
    const service = createBlockService({ expiredDemo: true });

    await expect(service.create(1, { targetUserId: 2 })).rejects.toEqual(
      new BlockServiceError("BLOCK_TARGET_NOT_ACCESSIBLE"),
    );
  });

  it("lists only outgoing blocks", async () => {
    const blocks = createBlockRepository({
      listOutgoing: vi
        .fn()
        .mockResolvedValue([
          createBlockedUserRecord({ id: 11, blockedUserId: 2 }),
          createBlockedUserRecord({ id: 12, blockedUserId: 3 }),
        ]),
    });
    const service = createBlockService({ blocks });

    await expect(service.list(1)).resolves.toEqual([
      {
        userId: 2,
        name: "user_2",
        blockedAt: "2026-08-29T00:10:00.000Z",
      },
      {
        userId: 3,
        name: "user_3",
        blockedAt: "2026-08-29T00:10:00.000Z",
      },
    ]);
    expect(blocks.listOutgoing).toHaveBeenCalledWith(1);
  });

  it("removes only the caller's outgoing row without restoring follows", async () => {
    const blocks = createBlockRepository();
    const service = createBlockService({ blocks });

    await expect(service.remove(1, { targetUserId: 2 })).resolves.toEqual({
      targetUserId: 2,
      removed: true,
    });
    expect(blocks.removeOutgoing).toHaveBeenCalledWith(1, 2);
    expect(blocks.createAndRemoveFollows).not.toHaveBeenCalled();
  });
});
