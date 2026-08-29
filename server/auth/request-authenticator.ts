import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import type { IdentityUserResolver } from "./identity-user-resolver";
import type { TokenVerifier } from "./token-verifier";

type UserResolver = Pick<IdentityUserResolver, "resolve">;

export class RequestAuthenticator {
  constructor(
    private readonly tokenVerifier: TokenVerifier,
    private readonly userResolver: UserResolver,
  ) {}

  async authenticate(req: Request): Promise<User | null> {
    const token = this.getBearerToken(req);
    if (!token) return null;

    let identity;
    try {
      identity = await this.tokenVerifier.verify(token);
    } catch {
      return null;
    }

    const user = await this.userResolver.resolve(identity);
    if (user.deletedAt || user.suspendedAt) {
      return null;
    }

    return user;
  }

  private getBearerToken(req: Request): string | null {
    const authorization = req.headers.authorization;
    if (!authorization) return null;

    const match = authorization.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();
    return token || null;
  }
}
