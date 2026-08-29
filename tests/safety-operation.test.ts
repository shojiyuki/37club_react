import { describe, expect, it, vi } from "vitest";

import { createSafetyOperationController } from "../components/safety/safety-operation";
import {
  canRequestPostSheetClose,
  createInitialPostSafetyFlowState,
  getPostSafetyFlowEffectForSession,
  getReportTargetKey,
  reducePostSafetyFlow,
  submitPostSafetyBlock,
  submitPostSafetyReport,
} from "../components/post-comments/post-safety";

const TEST_SESSION_KEY = "post-safety-test";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("safety operation controller", () => {
  it("prevents the parent sheet hardware-back close while an inline safety stage is active", () => {
    const initial = createInitialPostSafetyFlowState();
    const target = {
      contentReport: {
        targetType: "post" as const,
        targetId: "post-1",
        targetLabel: "投稿" as const,
      },
      userReport: {
        targetType: "user" as const,
        targetId: "user-2",
        targetLabel: "ユーザー" as const,
      },
      blockUserId: "user-2",
    };

    expect(canRequestPostSheetClose(initial)).toBe(true);
    expect(
      canRequestPostSheetClose(
        reducePostSafetyFlow(initial, {
          type: "open_menu",
          target,
          sessionKey: TEST_SESSION_KEY,
        }),
      ),
    ).toBe(false);
    expect(
      canRequestPostSheetClose(
        reducePostSafetyFlow(initial, {
          type: "open_report",
          selection: target.contentReport,
          sessionKey: TEST_SESSION_KEY,
        }),
      ),
    ).toBe(false);
    expect(
      canRequestPostSheetClose(
        reducePostSafetyFlow(initial, {
          type: "open_block",
          targetUserId: target.blockUserId,
          sessionKey: TEST_SESSION_KEY,
        }),
      ),
    ).toBe(false);
  });

  it("keeps report submission mutation-only until guarded success requests one committed alert transition", async () => {
    const selection = {
      targetType: "post_comment" as const,
      targetId: "comment-1",
      targetLabel: "コメント" as const,
    };
    let state = reducePostSafetyFlow(createInitialPostSafetyFlowState(), {
      type: "open_report",
      selection,
      sessionKey: TEST_SESSION_KEY,
    });
    const report = vi.fn().mockResolvedValue({ id: "report-1" });
    const controller = createSafetyOperationController();

    await controller.run({
      operation: () =>
        submitPostSafetyReport({
          selection,
          input: { reason: "spam", details: "details" },
          report,
        }),
      onPendingChange: vi.fn(),
      onSuccess: () => {
        state = reducePostSafetyFlow(state, {
          type: "report_succeeded",
          targetKey: getReportTargetKey(selection),
          sessionKey: TEST_SESSION_KEY,
        });
      },
      onError: vi.fn(),
    });

    expect(report).toHaveBeenCalledWith({
      targetType: "post_comment",
      targetId: "comment-1",
      reason: "spam",
      details: "details",
    });
    expect(state.stage).toEqual({ type: "none" });
    expect(state.effect?.type).toBe("show_report_success");
    expect(getPostSafetyFlowEffectForSession(state, TEST_SESSION_KEY)).toBe(
      state.effect,
    );
    expect(
      getPostSafetyFlowEffectForSession(state, "different-post-session"),
    ).toBeNull();

    const duplicate = reducePostSafetyFlow(state, {
      type: "report_succeeded",
      targetKey: getReportTargetKey(selection),
      sessionKey: TEST_SESSION_KEY,
    });
    expect(duplicate.effect).toBe(state.effect);
  });

  it("produces no report transition or alert request for stale completion", async () => {
    const selection = {
      targetType: "post" as const,
      targetId: "post-1",
      targetLabel: "投稿" as const,
    };
    let state = reducePostSafetyFlow(createInitialPostSafetyFlowState(), {
      type: "open_report",
      selection,
      sessionKey: TEST_SESSION_KEY,
    });
    const deferred = createDeferred<{ id: string }>();
    const controller = createSafetyOperationController();
    const running = controller.run({
      operation: () =>
        submitPostSafetyReport({
          selection,
          input: { reason: "harassment" },
          report: () => deferred.promise,
        }),
      onPendingChange: vi.fn(),
      onSuccess: () => {
        state = reducePostSafetyFlow(state, {
          type: "report_succeeded",
          targetKey: getReportTargetKey(selection),
          sessionKey: TEST_SESSION_KEY,
        });
      },
      onError: vi.fn(),
    });

    controller.advanceSession();
    state = reducePostSafetyFlow(state, { type: "reset" });
    deferred.resolve({ id: "stale-report" });
    await running;

    expect(state).toEqual({ stage: { type: "none" }, effect: null });
  });

  it("requests post-sheet close only after guarded block mutation resolves", async () => {
    let state = reducePostSafetyFlow(createInitialPostSafetyFlowState(), {
      type: "open_block",
      targetUserId: "user-2",
      sessionKey: TEST_SESSION_KEY,
    });
    const deferred = createDeferred<{ ok: true }>();
    const blockUser = vi.fn(() => deferred.promise);
    const controller = createSafetyOperationController();
    const running = controller.run({
      operation: () =>
        submitPostSafetyBlock({ targetUserId: "user-2", blockUser }),
      onPendingChange: vi.fn(),
      onSuccess: () => {
        state = reducePostSafetyFlow(state, {
          type: "block_succeeded",
          targetUserId: "user-2",
          sessionKey: TEST_SESSION_KEY,
        });
      },
      onError: vi.fn(),
    });

    expect(blockUser).toHaveBeenCalledWith({ targetUserId: "user-2" });
    expect(state.stage).toEqual({
      type: "block",
      targetUserId: "user-2",
      sessionKey: TEST_SESSION_KEY,
    });
    expect(state.effect).toBeNull();

    deferred.resolve({ ok: true });
    await running;

    expect(state.stage).toEqual({ type: "none" });
    expect(state.effect?.type).toBe("close_post_sheet");
  });

  it("ignores stale success after the session advances and still clears pending on settle", async () => {
    const controller = createSafetyOperationController();
    const deferred = createDeferred<string>();
    const onPendingChange = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onClose = vi.fn();

    const runPromise = controller.run({
      operation: () => deferred.promise,
      onPendingChange,
      onSuccess: () => {
        onSuccess();
        onClose();
      },
      onError,
    });

    expect(controller.isSubmitting()).toBe(true);

    controller.advanceSession();

    expect(controller.isSubmitting()).toBe(true);

    deferred.resolve("ok");
    await runPromise;

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(controller.isSubmitting()).toBe(false);
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
  });

  it("ignores stale failure after the session advances and still clears pending on settle", async () => {
    const controller = createSafetyOperationController();
    const deferred = createDeferred<string>();
    const onPendingChange = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const runPromise = controller.run({
      operation: () => deferred.promise,
      onPendingChange,
      onSuccess,
      onError,
    });

    controller.advanceSession();
    deferred.reject(new Error("stale failure"));
    await runPromise;

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(controller.isSubmitting()).toBe(false);
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
  });

  it("applies current-session success callbacks", async () => {
    const controller = createSafetyOperationController();
    const onPendingChange = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onClose = vi.fn();

    await controller.run({
      operation: async () => "ok",
      onPendingChange,
      onSuccess: () => {
        onSuccess();
        onClose();
      },
      onError,
    });

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
    expect(controller.isSubmitting()).toBe(false);
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
  });

  it("applies current-session failure callbacks", async () => {
    const controller = createSafetyOperationController();
    const onPendingChange = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await controller.run({
      operation: async () => {
        throw new Error("current failure");
      },
      onPendingChange,
      onSuccess,
      onError,
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(controller.isSubmitting()).toBe(false);
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
  });
});
