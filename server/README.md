# Backend Development Guide

This guide covers server-side features including authentication, database, tRPC API, and integrations. **Only read this if your app needs these capabilities.**

---

## When Do You Need Backend?

| Scenario | Backend Needed? | User Auth Required? | Solution |
|----------|-----------------|---------------------|----------|
| Data stays on device only | No | No | Use `AsyncStorage` |
| Data syncs across devices | Yes | Yes | Database + tRPC |
| User accounts / login | Yes | Yes | Cognito access token |
| AI-powered features | Yes | **Optional** | LLM Integration |
| User uploads files | Yes | **Optional** | S3 Storage |
| Server-side validation | Yes | **Optional** | tRPC procedures |

> **Note:** Backend ≠ User Auth. You can run a backend with LLM/Storage/ImageGen capabilities without requiring user login — just use `publicProcedure` instead of `protectedProcedure`. User auth is only mandatory when you need to identify users or sync user-specific data.

---

## File Structure

```
server/
  db.ts              ← Query helpers (add database functions here)
  routers.ts         ← tRPC procedures (add API routes here)
  storage.ts         ← S3 storage helpers (can extend)
  _core/             ← Framework-level code (don't modify)
drizzle/
  schema.ts          ← Database tables & types (add your tables here)
  relations.ts       ← Table relationships
  migrations/        ← Auto-generated migrations
shared/
  types.ts           ← Shared TypeScript types
  const.ts           ← Shared constants
  _core/             ← Framework-level code (don't modify)
lib/
  trpc.ts            ← tRPC client (can customize headers)
  _core/             ← Framework-level code (don't modify)
hooks/
  use-auth.ts        ← Auth state hook (don't modify)
tests/
  *.test.ts          ← Add your tests here
```

Only touch the files with "←" markers. Anything under `_core/` directories is framework-level—avoid editing unless you are extending the infrastructure.

---

## Authentication

### Overview

The app uses **Cognito OAuth/OIDC** on the client and verifies Cognito access tokens on the API server.

| Platform | Auth Method | Token Storage |
|----------|-------------|---------------|
| iOS/Android | Cognito access token | expo-secure-store refresh token + memory access token |
| Web | Cognito access token | AuthSession/browser storage + memory access token |

### Using the Auth Hook

```tsx
import { useAuth } from "@/hooks/use-auth";

function MyScreen() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  if (loading) return <ActivityIndicator />;
  
  if (!isAuthenticated) {
    return <LoginButton />;
  }

  return (
    <View>
      <ThemedText>Welcome, {user.name}</ThemedText>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
```

### User Object

The `user` object contains:

```tsx
interface User {
  id: number;
  openId: string | null; // legacy nullable field; internal identity is resolved via auth_accounts
  name: string | null;
  email: string | null;
  loginMethod: string;
  role: "user" | "admin";
  lastSignedIn: Date;
}
```

### Login Flow

1. User taps Sign In.
2. `CognitoAuthClient` starts an Authorization Code + PKCE flow with Cognito.
3. Cognito redirects back to the configured callback route.
4. The client exchanges the code for tokens.
5. tRPC requests send the Cognito access token as `Authorization: Bearer <token>`.
6. The API verifies the token and resolves the internal `users.id` through `auth_accounts`.

### Protected Routes

Use `protectedProcedure` in tRPC to require authentication:

```tsx
// server/routers.ts
import { protectedProcedure } from "./_core/trpc";

export const appRouter = router({
  myFeature: router({
    getData: protectedProcedure.query(({ ctx }) => {
      // ctx.user is guaranteed to exist
      return db.getUserData(ctx.user.id);
    }),
  }),
});

```
### Frontend: Handling Auth Errors
protectedProcedure MUST HANDLE UNAUTHORIZED when user is not logged in. Always handle this in the frontend:
```tsx
try {
  await trpc.someProtectedEndpoint.mutate(data);
} catch (error) {
  if (error.data?.code === 'UNAUTHORIZED') {
    router.push('/login');
    return;
  }
  throw error;
}
```

---

## Database

### Schema Definition

Define your tables in `drizzle/schema.ts`:

```tsx
import { int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

// Users table (already exists)
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Add your tables
export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Export types
export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;
```

### Running Migrations

After editing the schema, push changes to the database:

```bash
pnpm db:push
```

This runs `drizzle-kit generate` and `drizzle-kit migrate`.

### Query Helpers

Add database queries in `server/repositories/*` and use `getDb()` from `server/db.ts`:

```tsx
import { eq } from "drizzle-orm";
import { getDb } from "./_core/db";
import { items, InsertItem } from "../drizzle/schema";

export async function getUserItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(items).where(eq(items.userId, userId));
}

export async function createItem(data: InsertItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(items).values(data);
  return result.insertId;
}

export async function updateItem(id: number, data: Partial<InsertItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(items).set(data).where(eq(items.id, id));
}

export async function deleteItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(items).where(eq(items.id, id));
}
```

---

## tRPC API

### Adding Routes

Define API routes in `server/routers.ts`:

```tsx
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { itemRepository } from "./repositories/item-repository";

export const appRouter = router({
  // Public route (no auth required)
  health: publicProcedure.query(() => ({ status: "ok" })),

  // Protected routes (auth required)
  items: router({
    list: protectedProcedure.query(({ ctx }) => {
      return itemRepository.getUserItems(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.createItem({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        completed: z.boolean().optional(),
      }))
      .mutation(({ input }) => {
        return db.updateItem(input.id, input);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => {
        return db.deleteItem(input.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

### Calling from Frontend

Use tRPC hooks in your components:

```tsx
import { trpc } from "@/lib/trpc";

function ItemList() {
  // Query
  const { data: items, isLoading, refetch } = trpc.items.list.useQuery();

  // Mutation
  const createMutation = trpc.items.create.useMutation({
    onSuccess: () => refetch(),
  });

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      title: "New Item",
      description: "Description here",
    });
  };

  if (isLoading) return <ActivityIndicator />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <ItemCard item={item} />}
    />
  );
}
```

### Input Validation

Use Zod schemas for type-safe validation:

```tsx
import { z } from "zod";

const createItemSchema = z.object({
  title: z.string().min(1, "Title required").max(255),
  description: z.string().max(1000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.date().optional(),
});

// In router
create: protectedProcedure
  .input(createItemSchema)
  .mutation(({ ctx, input }) => {
    // input is fully typed
  }),
```

---

## LLM Integration

Use the preconfigured LLM helpers. Credentials are injected from the platform (no manual setup required).

```ts
import { invokeLLM } from "./server/_core/llm";

/**
 * Simple chat completion
 * type Role = "system" | "user" | "assistant" | "tool" | "function";
 * type TextContent = {
 *   type: "text";
 *   text: string;
 * };
 *
 * type ImageContent = {
 *   type: "image_url";
 *   image_url: {
 *     url: string;
 *     detail?: "auto" | "low" | "high";
 *   };
 * };
 *
 * type FileContent = {
 *   type: "file_url";
 *   file_url: {
 *     url: string;
 *     mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
 *   };
 * };
 *
 * export type Message = {
 *   role: Role;
 *   content: string | Array<ImageContent | TextContent | FileContent>
 * };
 *
 * Supported parameters:
 * messages: Array<{
 *   role: 'system' | 'user' | 'assistant' | 'tool',
 *   content: string | { tool_call: { name: string, arguments: string } }
 * }>
 * tool_choice?: 'none' | 'auto' | 'required' | { type: 'function', function: { name: string } }
 * tools?: Tool[]
 */
const response = await invokeLLM({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello, world!" },
  ],
});
```

Tips
- Always call llm functions from server-side code (e.g., inside tRPC procedures), to avoid exposing your API key.
- You don't need to manually set the model; the helper uses a sensible default.
- LLM responses often contain markdown. Use `<Streamdown>{content}</Streamdown>` (imported from `streamdown`) to render markdown content with proper formatting and streaming support.
- For image-based gen AI workflows, local `file://` and blob URLs don't work. Upload to S3 first, then pass the public URL to `invokeLLM()`.

### Structured Responses (JSON Schema)

Ask the model to return structured JSON via `response_format`:

```ts
import { invokeLLM } from "./server/_core/llm";

const structured = await invokeLLM({
  messages: [
    { role: "system", content: "You are a helpful assistant designed to output JSON." },
    { role: "user", content: "Extract the name and age from the following text: \"My name is Alice and I am 30 years old.\"" },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "person_info",
      strict: true,
      schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the person" },
          age: { type: "integer", description: "The age of the person" },
        },
        required: ["name", "age"],
        additionalProperties: false,
      },
    },
  },
});

// The model responds with JSON content matching the schema.
// Access via `structured.choices[0].message.content` and JSON.parse if needed.
```
The helpers mirror the Python SDK semantics but produce JavaScript-first code, keeping credentials inside the server and ensuring every environment has access to the same token.

**CRITICAL Note:** `json_schema` works for flat structures. For nested arrays/objects, use `json_object` instead.
```ts
const response = await invokeLLM({
  messages: [
    {
      role: "system",
      content: `Analyze the food image. Return JSON:
{
  "foods": [{ "name": "string", "calories": number }],
  "totalCalories": number
}`
    },
    {
      role: "user",
      content: [
        { type: "text", text: "What food is this?" },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    }
  ],
  response_format: { type: "json_object" }
});
const data = JSON.parse(response.choices[0].message.content);
```

---

## Voice Transcription Integration

Use the preconfigured voice transcription helper that converts speech to text using Whisper API, no manual setup required.

Example usage:
```ts
import { transcribeAudio } from "./server/_core/voiceTranscription";

const result = await transcribeAudio({
  audioUrl: "https://storage.example.com/audio/recording.mp3",
  language: "en", // Optional: helps improve accuracy
  prompt: "Transcribe meeting notes" // Optional: context hint
});

// Returns native Whisper API response
// result.text - Full transcription
// result.language - Detected language (ISO-639-1)
// result.segments - Timestamped segments with metadata
```

Tips
- Accepts URL to pre-uploaded audio file
- 16MB file size limit enforced during transcription, size flag to be set by frontend
- Supported formats: webm, mp3, wav, ogg, m4a
- Returns native Whisper API response with rich metadata
- Frontend should handle audio capture, storage upload, and size validation

---

## Image Generation Integration

Use the preconfigured image generation helper that connects to the internal ImageService, no manual setup required.

Example usage:
```ts
import { generateImage } from "./server/_core/imageGeneration.ts";

const { url: imageUrl } = await generateImage({
  prompt: "A serene landscape with mountains"
});
// For editing:
const { url: imageUrl } = await generateImage({
  prompt: "Add a rainbow to this landscape",
  originalImages: [{
    url: "https://example.com/original.jpg",
    mimeType: "image/jpeg"
  }]
});
```

Tips
- Always call from server-side code (e.g., inside tRPC procedures) to avoid exposing API keys
- Image generation can take 5-20 seconds, implement proper loading states
- Implement proper error handling as image generation can fail

---

## ☁️ File Storage

Use the preconfigured S3 helpers in `server/storage.ts`. Credentials are injected from the platform (no manual setup required).

```ts
import { storagePut } from "./server/storage";

// Upload bytes to S3 with non-enumerable path
// The S3 bucket is public, so returned URLs work without additional signing process
// Add random suffixes to file keys to prevent enumeration
const fileKey = `${userId}-files/${fileName}-${randomSuffix()}.png`
const { url } = await storagePut(
  fileKey,
  fileBuffer, // Buffer | Uint8Array | string
  "image/png"
);
```

Tips
- Save metadata (path/URL/ACL/owner/mime/size) in your database; use S3 for the actual file bytes. This applies to all files including images, documents, and media.
- For file uploads, have the client POST to your server, then call `storagePut` from your backend.

---

## ☁️ Data API

When you need external data, use the omni_search with search_type = 'api' to see there's any built-in api available in Manus API Hub access. You only have to connect other api if there's no suitable built-in api available.

---

## Owner Notifications

This template already ships with a `notifyOwner({ title, content })` helper (`server/_core/notification.ts`) and a protected tRPC mutation at `trpc.system.notifyOwner`. Use it whenever backend logic needs to push an operational update to the Manus project owner—common triggers are new form submissions, survey feedback, or workflow results.

1. On the server, call `await notifyOwner({ title, content })` or reuse the provided `system.notifyOwner` mutation from jobs/webhooks (`trpc.system.notifyOwner.useMutation()` on the client).
2. Handle the boolean return (`true` on success, `false` if the upstream service is temporarily unavailable) to decide whether you need a fallback channel.

Keep this channel for owner-facing alerts; end-user messaging should flow through your app-specific systems.

---

## Environment Variables

Available environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `OWNER_OPEN_ID` | Optional legacy owner openId for local admin role assignment |
| `BUILT_IN_FORGE_API_URL` | Manus API endpoint |
| `BUILT_IN_FORGE_API_KEY` | Manus API key |
| `COGNITO_ISSUER` | Cognito User Pool issuer |
| `COGNITO_DOMAIN` | Cognito hosted UI domain |
| `COGNITO_CLIENT_ID` | Cognito app client ID |
| `COGNITO_SCOPES` | Cognito OAuth scopes |

Expo runtime variables (prefixed with `EXPO_PUBLIC_`):

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | API server URL |

---

## Testing

Write tests in `tests/` using Vitest:

```tsx
// tests/items.test.ts
import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";

describe("items", () => {
  it("creates an item", async () => {
    const ctx = createMockContext({ userId: 1 });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.items.create({
      title: "Test Item",
      description: "Test description",
    });

    expect(result).toBeDefined();
  });
});
```

Run tests:

```bash
pnpm test
```

---

## Key Files Reference

## Core File References

`drizzle/schema.ts`
```ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Legacy nullable provider identifier. New auth identities live in auth_accounts. */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here
```

`server/db.ts`
```ts
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2";

let _db: MySql2Database<Record<string, unknown>> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(
        mysql.createPool({
          uri: process.env.DATABASE_URL,
          charset: "utf8mb4",
        }).promise(),
      );
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
```

Feature queries should live in repositories, for example:

```ts
// server/repositories/user-repository.ts
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
```

`server/routers.ts`
```ts
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
```

`server/storage.ts`
```ts
// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { ENV } from "./_core/env";

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(baseUrl: string, relKey: string, apiKey: string): Promise<string> {
  const downloadApiUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(baseUrl));
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string,
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`,
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
```

`lib/trpc.ts`
```ts
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/api";
import { cognitoAuthClient } from "@/lib/auth/cognito-auth-client";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const token = await cognitoAuthClient.getValidAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
```

`hooks/use-auth.ts`
```ts
import { useAuth } from "@/hooks/use-auth";

function LoginButton() {
  const { user, loading, signIn, signOut } = useAuth();
  // signIn/signOut delegate token handling to CognitoAuthClient.
  // API identity is resolved server-side from the Bearer access token.
}
```

`tests/request-authenticator.test.ts`
```ts
import { describe, expect, it } from "vitest";
import { RequestAuthenticator } from "../server/auth/request-authenticator";

describe("RequestAuthenticator", () => {
  it("resolves users from a Cognito bearer token", async () => {
    // See tests/request-authenticator.test.ts for the full mock verifier setup.
  });
});
```

---

## Common Patterns

### Optimistic Updates

Update UI immediately, revert on error:

```tsx
const toggleComplete = trpc.items.update.useMutation({
  onMutate: async (input) => {
    // Cancel outgoing queries
    await utils.items.list.cancel();
    
    // Snapshot previous value
    const previous = utils.items.list.getData();
    
    // Optimistically update
    utils.items.list.setData(undefined, (old) =>
      old?.map((item) =>
        item.id === input.id
          ? { ...item, completed: input.completed }
          : item
      )
    );
    
    return { previous };
  },
  onError: (err, input, context) => {
    // Revert on error
    utils.items.list.setData(undefined, context?.previous);
  },
  onSettled: () => {
    // Refetch after mutation
    utils.items.list.invalidate();
  },
});
```

### Pagination

```tsx
// Router
list: protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).default(20),
    cursor: z.number().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const items = await db.getItems({
      userId: ctx.user.id,
      limit: input.limit + 1,
      cursor: input.cursor,
    });
    
    let nextCursor: number | undefined;
    if (items.length > input.limit) {
      const next = items.pop();
      nextCursor = next?.id;
    }
    
    return { items, nextCursor };
  }),

// Frontend
const { data, fetchNextPage, hasNextPage } = trpc.items.list.useInfiniteQuery(
  { limit: 20 },
  { getNextPageParam: (lastPage) => lastPage.nextCursor }
);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Database not available" | Check `DATABASE_URL` is set |
| Auth not working | Verify OAuth callback URL matches |
| tRPC type errors | Run `pnpm check` to verify types |
| Mutations fail silently | Check browser console for errors |
| Session expired | User needs to login again |
