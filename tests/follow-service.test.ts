import { describe, expect, it, vi } from "vitest";

import type { FollowRepository } from "../server/repositories/follow-repository";
import { FollowService, FollowServiceError } from "../server/services/follow-service";

function createRepository(overrides: Partial<FollowRepository> = {}): FollowRepository {
  return {
    userExists: vi.fn().mockResolvedValue(true),
    isFollowing: vi.fn().mockResolvedValue(false),
    follow: vi.fn().mockResolvedValue(undefined),
    unfollow: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("FollowService", () => {
  it("follows a target user and returns following state", async () => {
    const repository = createRepository({
      isFollowing: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
    });
    const service = new FollowService(repository);

    await expect(service.setFollowing(1, { targetUserId: 2, following: true })).resolves.toEqual({
      targetUserId: 2,
      followState: "following",
    });

    expect(repository.follow).toHaveBeenCalledWith(1, 2);
    expect(repository.unfollow).not.toHaveBeenCalled();
  });

  it("returns mutual when both users follow each other", async () => {
    const repository = createRepository({
      isFollowing: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(true),
    });
    const service = new FollowService(repository);

    await expect(service.setFollowing(1, { targetUserId: 2, following: true })).resolves.toEqual({
      targetUserId: 2,
      followState: "mutual",
    });
  });

  it("unfollows a target user and returns none state", async () => {
    const repository = createRepository({
      isFollowing: vi.fn().mockResolvedValueOnce(false),
    });
    const service = new FollowService(repository);

    await expect(service.setFollowing(1, { targetUserId: 2, following: false })).resolves.toEqual({
      targetUserId: 2,
      followState: "none",
    });

    expect(repository.unfollow).toHaveBeenCalledWith(1, 2);
    expect(repository.follow).not.toHaveBeenCalled();
  });

  it("rejects following yourself", async () => {
    const service = new FollowService(createRepository());

    await expect(service.setFollowing(1, { targetUserId: 1, following: true })).rejects.toEqual(
      new FollowServiceError("CANNOT_FOLLOW_SELF"),
    );
  });

  it("rejects a missing target user", async () => {
    const service = new FollowService(createRepository({ userExists: vi.fn().mockResolvedValue(false) }));

    await expect(service.setFollowing(1, { targetUserId: 2, following: true })).rejects.toEqual(
      new FollowServiceError("USER_NOT_FOUND"),
    );
  });
});
