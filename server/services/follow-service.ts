import type { BlockRepository } from "../repositories/block-repository";
import type { FollowRepository } from "../repositories/follow-repository";

export type FollowState = "none" | "following" | "mutual";

export type SetFollowingInput = {
  targetUserId: number;
  following: boolean;
};

export type SetFollowingResponse = {
  targetUserId: number;
  followState: FollowState;
};

export type FollowServiceErrorCode =
  | "CANNOT_FOLLOW_SELF"
  | "USER_NOT_FOUND"
  | "USER_BLOCKED"
  | "NOT_ACTIVE_IN_SAME_TOPIC";

export class FollowServiceError extends Error {
  constructor(readonly code: FollowServiceErrorCode) {
    super(code);
  }
}

export class FollowService {
  constructor(
    private readonly repository: FollowRepository,
    private readonly blockRepository: BlockRepository,
  ) {}

  async setFollowing(
    viewerUserId: number,
    input: SetFollowingInput,
  ): Promise<SetFollowingResponse> {
    if (viewerUserId === input.targetUserId) {
      throw new FollowServiceError("CANNOT_FOLLOW_SELF");
    }

    if (
      input.following &&
      (await this.blockRepository.hasEitherDirection(
        viewerUserId,
        input.targetUserId,
      ))
    ) {
      throw new FollowServiceError("USER_BLOCKED");
    }

    if (!(await this.repository.userExists(input.targetUserId))) {
      throw new FollowServiceError("USER_NOT_FOUND");
    }

    if (input.following) {
      if (
        !(await this.repository.areActiveInSameTopic(
          viewerUserId,
          input.targetUserId,
        ))
      ) {
        throw new FollowServiceError("NOT_ACTIVE_IN_SAME_TOPIC");
      }
      await this.repository.follow(viewerUserId, input.targetUserId);
    } else {
      await this.repository.unfollow(viewerUserId, input.targetUserId);
    }

    return {
      targetUserId: input.targetUserId,
      followState: await this.getFollowState(viewerUserId, input.targetUserId),
    };
  }

  private async getFollowState(
    viewerUserId: number,
    targetUserId: number,
  ): Promise<FollowState> {
    const viewerFollowsTarget = await this.repository.isFollowing(
      viewerUserId,
      targetUserId,
    );
    if (!viewerFollowsTarget) {
      return "none";
    }

    const targetFollowsViewer = await this.repository.isFollowing(
      targetUserId,
      viewerUserId,
    );
    return targetFollowsViewer ? "mutual" : "following";
  }
}
