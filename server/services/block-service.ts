import type { User } from "../../drizzle/schema";
import { areUsersEffectiveActiveInSameTopic } from "../domain/user-interaction-access";
import type { AppReviewConfigRepository } from "../repositories/app-review-config-repository";
import type {
  BlockedUserRecord,
  BlockRepository,
} from "../repositories/block-repository";
import type { ParticipationRepository } from "../repositories/participation-repository";

export type BlockedUserResponse = {
  userId: number;
  name: string;
  blockedAt: string;
};

export type RemoveBlockResponse = { targetUserId: number; removed: true };

export type BlockServiceErrorCode =
  | "CANNOT_BLOCK_SELF"
  | "BLOCK_TARGET_NOT_FOUND"
  | "BLOCK_TARGET_NOT_ACCESSIBLE";

export class BlockServiceError extends Error {
  constructor(readonly code: BlockServiceErrorCode) {
    super(code);
  }
}

export class BlockService {
  constructor(
    private readonly blockRepository: BlockRepository,
    private readonly participationRepository: ParticipationRepository,
    private readonly appReviewConfigRepository: AppReviewConfigRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async list(blockerUserId: number): Promise<BlockedUserResponse[]> {
    const records = await this.blockRepository.listOutgoing(blockerUserId);
    return records.map(toBlockedUserResponse);
  }

  async create(
    blockerUserId: number,
    input: { targetUserId: number },
  ): Promise<BlockedUserResponse> {
    if (blockerUserId === input.targetUserId) {
      throw new BlockServiceError("CANNOT_BLOCK_SELF");
    }

    const existing = await this.blockRepository.findOutgoing(
      blockerUserId,
      input.targetUserId,
    );
    if (existing) return toBlockedUserResponse(existing);

    const target = await this.blockRepository.findAvailableUserById(
      input.targetUserId,
    );
    if (!target) {
      throw new BlockServiceError("BLOCK_TARGET_NOT_FOUND");
    }

    const [first, second] = await Promise.all([
      this.participationRepository.findActiveByUserId(blockerUserId),
      this.participationRepository.findActiveByUserId(input.targetUserId),
    ]);
    const appReviewConfig = first
      ? await this.appReviewConfigRepository.findByTopicId(first.topic.id)
      : undefined;
    const sameTopic = areUsersEffectiveActiveInSameTopic({
      first,
      second,
      appReviewConfig,
      now: this.clock(),
    });
    const sharedRoom = sameTopic
      ? false
      : await this.blockRepository.haveSharedChatRoom(
          blockerUserId,
          input.targetUserId,
        );
    if (!sameTopic && !sharedRoom) {
      throw new BlockServiceError("BLOCK_TARGET_NOT_ACCESSIBLE");
    }

    return toBlockedUserResponse(
      await this.blockRepository.createAndRemoveFollows(
        blockerUserId,
        input.targetUserId,
      ),
    );
  }

  async remove(
    blockerUserId: number,
    input: { targetUserId: number },
  ): Promise<RemoveBlockResponse> {
    await this.blockRepository.removeOutgoing(
      blockerUserId,
      input.targetUserId,
    );
    return { targetUserId: input.targetUserId, removed: true };
  }
}

function toBlockedUserResponse(record: BlockedUserRecord): BlockedUserResponse {
  return {
    userId: record.user.id,
    name: toUserName(record.user),
    blockedAt: record.block.createdAt.toISOString(),
  };
}

function toUserName(user: User): string {
  return user.name ?? `user_${user.id}`;
}
