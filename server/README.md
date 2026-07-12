# 37Club Server Guide

This server is a local Express + tRPC API for the 37Club app. It owns product data, authentication checks, S3 upload/read URL generation, and server-side policy decisions.

## Runtime

- `pnpm dev:server`: start the API server in development mode.
- `pnpm dev:local`: start local API + Metro using `.env.local`.
- `pnpm dev:local:clear`: same as local, but clears Metro cache.
- `pnpm dev:mock`: start Metro using `.env.mock`; the API server is not required for mock data.
- `pnpm check`: TypeScript check.
- `pnpm test`: Vitest.
- `pnpm db:push`: generate and apply Drizzle migrations.

## Environment

Required for local API mode:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL connection string |
| `COGNITO_ISSUER` | Cognito User Pool issuer |
| `COGNITO_CLIENT_ID` | Cognito app client ID |
| `AWS_REGION` | S3 region |
| `S3_BUCKET` | S3 bucket for uploaded post images |

Optional:

| Variable | Purpose |
| --- | --- |
| `OWNER_OPEN_ID` | Legacy nullable owner identifier used only for local admin role assignment |
| `AWS_PROFILE` | Local AWS profile. The SDK resolves credentials from `~/.aws/credentials` |

Client runtime selection is handled by `.env.*`, `scripts/sync-env.js`, `app.config.ts`, and `constants/runtime-config.ts`.

## Authentication

The app uses Cognito OAuth/OIDC on the client and sends the Cognito access token to tRPC as:

```http
Authorization: Bearer <access-token>
```

Server authentication is resolved in this order:

1. `server/auth/request-authenticator.ts` reads the bearer token.
2. `server/auth/cognito-token-verifier.ts` verifies the token.
3. `server/auth/identity-user-resolver.ts` maps the Cognito identity to the internal `users.id` through `auth_accounts`.
4. tRPC procedures receive the internal user as `ctx.user`.

Important rule: product APIs should trust `ctx.user.id`, not a user id sent from the client. For example, chat message sender, follow follower, upload key owner, and participation user are server-side decisions.

Use `protectedProcedure` for authenticated API methods:

```ts
import { protectedProcedure, router } from "../_core/trpc";

export const exampleRouter = router({
  meOnly: protectedProcedure.query(({ ctx }) => {
    return { userId: ctx.user.id };
  }),
});
```

## Database

Schema lives in `drizzle/schema.ts`.

DB connection lives in `server/db.ts` and should stay limited to creating and returning the Drizzle instance.

Feature queries should live in `server/repositories/*`:

```ts
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
```

## API Structure

The app router is `server/routers.ts`.

Current product routers:

- `topics`
- `posts`
- `participation`
- `storage`
- `follow`
- `chat`
- `auth.me`
- `system.health`

Feature routers should live in `server/routers/*` and be mounted from `server/routers.ts`.

## Storage

Post images are stored in S3. The client does not receive AWS credentials.

Flow:

1. Client asks `storage.createUploadUrl` for a presigned PUT URL.
2. Client uploads image bytes directly to S3 with that URL.
3. Client calls `participation.checkIn` with the resulting `imageStorageKey`.
4. Server validates the key and confirms the object exists before creating/updating DB records.
5. Read URLs are generated server-side and returned to the client as presigned GET URLs.

Upload keys must stay under:

```text
users/{ctx.user.id}/posts/
```

Unused uploaded objects can be removed through `storage.discardUpload`, but only if the key belongs to the current user and is not referenced by `posts.imageStorageKey`.

## Domain Rules

Current MVP policy:

- A user can have one participation per topic.
- Re-check-in after checkout reactivates the existing participation and updates the existing post image/caption.
- DROPS shows only active participants for the current topic.
- Follow creation requires both viewer and target to be active in the same topic.
- Unfollow is allowed even after checkout.
- Chat list/messages/send require mutual follow and both users active in the same topic.

## Health

Use `/api/health` for simple HTTP health checks.

`system.health` also exists inside tRPC for client-side or tRPC-level checks.
