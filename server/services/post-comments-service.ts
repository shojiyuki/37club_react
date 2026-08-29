import {
  noAppReviewConfigRepository,
  type AppReviewConfigRepository,
} from "../repositories/app-review-config-repository";
import type { ParticipationRepository } from "../repositories/participation-repository";
import type {
  PostCommentRecord,
  PostCommentsRepository,
} from "../repositories/post-comments-repository";
import { resolveParticipationExpiresAt } from "../domain/participation-access";

export type PostCommentsServiceErrorCode =
  | "POST_NOT_FOUND"
  | "NO_ACTIVE_PARTICIPATION"
  | "POST_NOT_IN_ACTIVE_TOPIC"
  | "PARTICIPATION_EXPIRED"
  | "EMPTY_COMMENT"
  | "COMMENT_TOO_LONG";

export class PostCommentsServiceError extends Error {
  constructor(readonly code: PostCommentsServiceErrorCode) {
    super(code);
  }
}

export type PostCommentResponse = {
  id: number;
  postId: number;
  user: { id: number; name: string; isMine: boolean };
  body: string;
  createdAt: string;
};

type Clock = () => Date;

export class PostCommentsService {
  constructor(
    private readonly commentsRepository: PostCommentsRepository,
    private readonly participationRepository: ParticipationRepository,
    private readonly appReviewConfigRepository: AppReviewConfigRepository = noAppReviewConfigRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async list(
    viewerUserId: number,
    input: { postId: number },
  ): Promise<PostCommentResponse[]> {
    await this.requireAccess(viewerUserId, input.postId);
    const records = await this.commentsRepository.listByPostId(input.postId);
    return records.map((record) => this.toResponse(viewerUserId, record));
  }

  async create(
    viewerUserId: number,
    input: { postId: number; body: string },
  ): Promise<PostCommentResponse> {
    await this.requireAccess(viewerUserId, input.postId);
    this.validateBody(input.body);
    const record = await this.commentsRepository.create({
      postId: input.postId,
      userId: viewerUserId,
      body: input.body,
    });
    return this.toResponse(viewerUserId, record);
  }

  private async requireAccess(
    viewerUserId: number,
    postId: number,
  ): Promise<void> {
    const active =
      await this.participationRepository.findActiveByUserId(viewerUserId);
    if (!active) {
      throw new PostCommentsServiceError("NO_ACTIVE_PARTICIPATION");
    }

    const now = this.clock();
    const appReviewConfig = await this.appReviewConfigRepository.findByTopicId(
      active.topic.id,
    );
    const expiresAt = resolveParticipationExpiresAt({
      topicId: active.topic.id,
      topicEndAt: active.topic.endAt,
      checkedInAt: active.participation.checkedInAt,
      appReviewConfig,
      now,
    });
    if (!expiresAt || expiresAt <= now) {
      await this.participationRepository.markExpired(active.participation.id);
      throw new PostCommentsServiceError("PARTICIPATION_EXPIRED");
    }

    const post = await this.commentsRepository.findPostById(postId);
    if (!post) {
      throw new PostCommentsServiceError("POST_NOT_FOUND");
    }
    if (post.topicId !== active.topic.id) {
      throw new PostCommentsServiceError("POST_NOT_IN_ACTIVE_TOPIC");
    }
  }

  private validateBody(body: string): void {
    if (body.length > 200) {
      throw new PostCommentsServiceError("COMMENT_TOO_LONG");
    }
    if (body.trim().length === 0) {
      throw new PostCommentsServiceError("EMPTY_COMMENT");
    }
  }

  private toResponse(
    viewerUserId: number,
    record: PostCommentRecord,
  ): PostCommentResponse {
    return {
      id: record.comment.id,
      postId: record.comment.postId,
      user: {
        id: record.user.id,
        name: record.user.name ?? `user_${record.user.id}`,
        isMine: record.user.id === viewerUserId,
      },
      body: record.comment.body,
      createdAt: record.comment.createdAt.toISOString(),
    };
  }
}
