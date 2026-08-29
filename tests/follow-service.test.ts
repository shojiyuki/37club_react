import { describe, expect, it, vi } from "vitest";

import type { BlockRepository } from "../server/repositories/block-repository";
import type { FollowRepository } from "../server/repositories/follow-repository";
import {
  FollowService,
  FollowServiceError,
} from "../server/services/follow-service";

function createRepository(
  overrides: Partial<FollowRepository> = {},
): FollowRepository {
  return {
    userExists: vi.fn().mockResolvedValue(true),
    areActiveInSameTopic: vi.fn().mockResolvedValue(true),
    isFollowing: vi.fn().mockResolvedValue(false),
    follow: vi.fn().mockResolvedValue(undefined),
    unfollow: vi.fn().mockResolvedValue(undefined),
    ...overrides,
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

describe("FollowService", () => {
  it("follows a target user and returns following state", async () => {
    const repository = createRepository({
      isFollowing: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
    });
    const service = new FollowService(repository, createBlockRepository());

    await expect(
      service.setFollowing(1, { targetUserId: 2, following: true }),
    ).resolves.toEqual({
      targetUserId: 2,
      followState: "following",
    });

    expect(repository.follow).toHaveBeenCalledWith(1, 2);
    expect(repository.unfollow).not.toHaveBeenCalled();
  });

  it("returns mutual when both users follow each other", async () => {
    const repository = createRepository({
      isFollowing: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true),
    });
    const service = new FollowService(repository, createBlockRepository());

    await expect(
      service.setFollowing(1, { targetUserId: 2, following: true }),
    ).resolves.toEqual({
      targetUserId: 2,
      followState: "mutual",
    });
  });

  it("rejects a new follow when either user has blocked the other", async () => {
    const repository = createRepository();
    const blocks = createBlockRepository({
      hasEitherDirection: vi.fn().mockResolvedValue(true),
    });
    const service = new FollowService(repository, blocks);

    await expect(
      service.setFollowing(1, { targetUserId: 2, following: true }),
    ).rejects.toEqual(new FollowServiceError("USER_BLOCKED"));
    expect(repository.follow).not.toHaveBeenCalled();
  });

  it("unfollows a target user and returns none state", async () => {
    const repository = createRepository({
      isFollowing: vi.fn().mockResolvedValueOnce(false),
    });
    const service = new FollowService(repository, createBlockRepository());

    await expect(
      service.setFollowing(1, { targetUserId: 2, following: false }),
    ).resolves.toEqual({
      targetUserId: 2,
      followState: "none",
    });

    expect(repository.unfollow).toHaveBeenCalledWith(1, 2);
    expect(repository.follow).not.toHaveBeenCalled();
  });

  it("allows unfollow when either user has blocked the other", async () => {
    const repository = createRepository();
    const blocks = createBlockRepository({
      hasEitherDirection: vi.fn().mockResolvedValue(true),
    });
    const service = new FollowService(repository, blocks);

    await expect(
      service.setFollowing(1, { targetUserId: 2, following: false }),
    ).resolves.toEqual({ targetUserId: 2, followState: "none" });
    expect(repository.unfollow).toHaveBeenCalledWith(1, 2);
    expect(blocks.hasEitherDirection).not.toHaveBeenCalled();
  });

  it("allows unfollow even when the target is not active in the same topic", async () => {
    const repository = createRepository({
      areActiveInSameTopic: vi.fn().mockResolvedValue(false),
      isFollowing: vi.fn().mockResolvedValueOnce(false),
    });
    const service = new FollowService(repository, createBlockRepository());

    await expect(
      service.setFollowing(1, { targetUserId: 2, following: false }),
    ).resolves.toEqual({
      targetUserId: 2,
      followState: "none",
    });

    expect(repository.areActiveInSameTopic).not.toHaveBeenCalled();
    expect(repository.unfollow).toHaveBeenCalledWith(1, 2);
  });

  it("rejects following yourself", async () => {
    const service = new FollowService(
      createRepository(),
      createBlockRepository(),
    );

    await expect(
      service.setFollowing(1, { targetUserId: 1, following: true }),
    ).rejects.toEqual(new FollowServiceError("CANNOT_FOLLOW_SELF"));
  });

  it("rejects a missing target user", async () => {
    const service = new FollowService(
      createRepository({ userExists: vi.fn().mockResolvedValue(false) }),
      createBlockRepository(),
    );

    await expect(
      service.setFollowing(1, { targetUserId: 2, following: true }),
    ).rejects.toEqual(new FollowServiceError("USER_NOT_FOUND"));
  });

  it("rejects follow when users are not active in the same topic", async () => {
    const repository = createRepository({
      areActiveInSameTopic: vi.fn().mockResolvedValue(false),
    });
    const service = new FollowService(repository, createBlockRepository());

    await expect(
      service.setFollowing(1, { targetUserId: 2, following: true }),
    ).rejects.toEqual(new FollowServiceError("NOT_ACTIVE_IN_SAME_TOPIC"));
    expect(repository.follow).not.toHaveBeenCalled();
  });
});
