import { describe, expect, it } from "vitest";

import { isTopicManagementServiceAuthorized } from "../server/topic-management/topic-management-auth";

const TOKEN = "a-secure-topic-management-token-1234567890";

describe("isTopicManagementServiceAuthorized", () => {
  it("accepts the exact bearer token", () => {
    expect(isTopicManagementServiceAuthorized(`Bearer ${TOKEN}`, TOKEN)).toBe(
      true,
    );
  });

  it("rejects missing, malformed, or different credentials", () => {
    expect(isTopicManagementServiceAuthorized(undefined, TOKEN)).toBe(false);
    expect(isTopicManagementServiceAuthorized(TOKEN, TOKEN)).toBe(false);
    expect(
      isTopicManagementServiceAuthorized("Bearer different-token", TOKEN),
    ).toBe(false);
  });

  it("rejects missing or short configured tokens", () => {
    expect(
      isTopicManagementServiceAuthorized(`Bearer ${TOKEN}`, undefined),
    ).toBe(false);
    expect(isTopicManagementServiceAuthorized("Bearer short", "short")).toBe(
      false,
    );
  });
});
