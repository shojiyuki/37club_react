import { and, asc, eq, isNull } from "drizzle-orm";

import { postComments, posts, users } from "../../drizzle/schema";
import { getDb } from "../db";

export type PostCommentRecord = {
  comment: typeof postComments.$inferSelect;
  user: typeof users.$inferSelect;
};

export interface PostCommentsRepository {
  findPostById(postId: number): Promise<typeof posts.$inferSelect | undefined>;
  listByPostId(postId: number): Promise<PostCommentRecord[]>;
  create(input: {
    postId: number;
    userId: number;
    body: string;
  }): Promise<PostCommentRecord>;
}

export class DrizzlePostCommentsRepository implements PostCommentsRepository {
  async findPostById(
    postId: number,
  ): Promise<typeof posts.$inferSelect | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const rows = await db
      .select({ post: posts })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          eq(posts.id, postId),
          isNull(posts.hiddenAt),
          isNull(users.suspendedAt),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return rows[0]?.post;
  }

  async listByPostId(postId: number): Promise<PostCommentRecord[]> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    return db
      .select({ comment: postComments, user: users })
      .from(postComments)
      .innerJoin(users, eq(postComments.userId, users.id))
      .innerJoin(posts, eq(postComments.postId, posts.id))
      .where(
        and(
          eq(postComments.postId, postId),
          isNull(postComments.hiddenAt),
          isNull(posts.hiddenAt),
          isNull(users.suspendedAt),
          isNull(users.deletedAt),
        ),
      )
      .orderBy(asc(postComments.createdAt), asc(postComments.id));
  }

  async create(input: {
    postId: number;
    userId: number;
    body: string;
  }): Promise<PostCommentRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const insertedIds = await db
      .insert(postComments)
      .values(input)
      .$returningId();
    const id = insertedIds[0]?.id;
    if (!id) throw new Error("Failed to create post comment");

    const rows = await db
      .select({ comment: postComments, user: users })
      .from(postComments)
      .innerJoin(users, eq(postComments.userId, users.id))
      .where(eq(postComments.id, id))
      .limit(1);
    if (!rows[0]) throw new Error("Failed to read created post comment");
    return rows[0];
  }
}
