import type {
  CurrentTopicPostRecord,
  MyCurrentPostRecord,
  PostsRepository,
} from "../repositories/posts-repository";
import type { FollowRepository } from "../repositories/follow-repository";
import type { Storage } from "../storage/storage";

type FollowState = "none" | "following" | "mutual";

export type PostListItemResponse = {
  id: string;
  user: {
    id: string;
    name: string;
    followState: "none" | "following" | "mutual";
    isMine: boolean;
  };
  imageUri: string;
  caption: string;
  topicId: string;
};

export type MyPostResponse = {
  imageUri: string | null;
  caption: string;
  postedAt: string;
  topicLabel: string;
};

export class PostsService {
  constructor(
    private readonly repository: PostsRepository,
    private readonly storage: Storage,
    private readonly followRepository: FollowRepository | null = null,
  ) {}

  async listCurrentTopicPosts(userId: number): Promise<PostListItemResponse[]> {
    const records = await this.repository.findCurrentTopicPosts(userId);
    return Promise.all(records.map((record) => this.toPostListItem(userId, record)));
  }

  async getMyCurrentPost(userId: number): Promise<MyPostResponse> {
    const record = await this.repository.findMyCurrentPost(userId);
    if (!record) {
      return {
        imageUri: null,
        caption: "",
        postedAt: "",
        topicLabel: "",
      };
    }

    return this.toMyPost(record);
  }

  private async toPostListItem(
    viewerUserId: number,
    record: CurrentTopicPostRecord,
  ): Promise<PostListItemResponse> {
    const imageUri = await this.storage.createReadUrl(record.post.imageStorageKey);
    return {
      id: String(record.post.id),
      user: {
        id: String(record.user.id),
        name: record.user.name ?? `user_${record.user.id}`,
        followState: await this.getFollowState(viewerUserId, record.user.id),
        isMine: viewerUserId === record.user.id,
      },
      imageUri,
      caption: record.post.caption,
      topicId: String(record.post.topicId),
    };
  }

  private async getFollowState(viewerUserId: number, authorUserId: number): Promise<FollowState> {
    if (!this.followRepository || viewerUserId === authorUserId) {
      return "none";
    }

    const viewerFollowsAuthor = await this.followRepository.isFollowing(viewerUserId, authorUserId);
    if (!viewerFollowsAuthor) {
      return "none";
    }

    const authorFollowsViewer = await this.followRepository.isFollowing(authorUserId, viewerUserId);
    return authorFollowsViewer ? "mutual" : "following";
  }

  private async toMyPost(record: MyCurrentPostRecord): Promise<MyPostResponse> {
    const imageUri = await this.storage.createReadUrl(record.post.imageStorageKey);
    return {
      imageUri,
      caption: record.post.caption,
      postedAt: record.post.createdAt.toISOString(),
      topicLabel: record.topic.locationName,
    };
  }
}
