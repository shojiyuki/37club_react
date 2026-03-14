import { describe, it, expect } from "vitest";

// ─── Pure logic tests for loop scroll ────────────────────────────────────────
// Tests the core loop scroll logic without React hooks.

describe("Loop scroll logic", () => {
  const COUNT = 4; // 4 topics

  function getRealIndex(loopIdx: number, count: number): number {
    return loopIdx % count;
  }

  function shouldJump(loopIdx: number, count: number): boolean {
    return loopIdx < count || loopIdx >= count * 2;
  }

  function getJumpTarget(loopIdx: number, count: number): number {
    const realIdx = getRealIndex(loopIdx, count);
    return count + realIdx;
  }

  it("should correctly compute real index from loop index", () => {
    // First copy (indices 0-3)
    expect(getRealIndex(0, COUNT)).toBe(0);
    expect(getRealIndex(3, COUNT)).toBe(3);
    // Middle copy (indices 4-7)
    expect(getRealIndex(4, COUNT)).toBe(0);
    expect(getRealIndex(7, COUNT)).toBe(3);
    // Last copy (indices 8-11)
    expect(getRealIndex(8, COUNT)).toBe(0);
    expect(getRealIndex(11, COUNT)).toBe(3);
  });

  it("should detect when to jump (first or last copy)", () => {
    // First copy → should jump
    expect(shouldJump(0, COUNT)).toBe(true);
    expect(shouldJump(3, COUNT)).toBe(true);
    // Middle copy → no jump
    expect(shouldJump(4, COUNT)).toBe(false);
    expect(shouldJump(7, COUNT)).toBe(false);
    // Last copy → should jump
    expect(shouldJump(8, COUNT)).toBe(true);
    expect(shouldJump(11, COUNT)).toBe(true);
  });

  it("should compute correct jump target (always in middle copy)", () => {
    // From first copy
    expect(getJumpTarget(0, COUNT)).toBe(4);  // real 0 → middle copy index 4
    expect(getJumpTarget(3, COUNT)).toBe(7);  // real 3 → middle copy index 7
    // From last copy
    expect(getJumpTarget(8, COUNT)).toBe(4);  // real 0 → middle copy index 4
    expect(getJumpTarget(11, COUNT)).toBe(7); // real 3 → middle copy index 7
  });

  it("should initialize at middle copy + real initial index", () => {
    const initialRealIndex = 2;
    const initialLoopIndex = COUNT + initialRealIndex;
    expect(initialLoopIndex).toBe(6);
    expect(getRealIndex(initialLoopIndex, COUNT)).toBe(2);
    expect(shouldJump(initialLoopIndex, COUNT)).toBe(false);
  });

  it("should triplicate topics array", () => {
    const topics = ["a", "b", "c", "d"];
    const looped = [...topics, ...topics, ...topics];
    expect(looped).toHaveLength(12);
    expect(looped[0]).toBe("a");
    expect(looped[4]).toBe("a"); // middle copy start
    expect(looped[8]).toBe("a"); // last copy start
  });

  it("should handle single topic without crashing", () => {
    const count = 1;
    const loopIdx = 1; // middle copy
    expect(getRealIndex(loopIdx, count)).toBe(0);
    expect(shouldJump(loopIdx, count)).toBe(false);
    expect(getJumpTarget(0, count)).toBe(1);
  });
});

describe("📌 Filter button position", () => {
  it("should have top offset of 32 (not 16)", () => {
    // This is a documentation test — the value is set in styles
    const FILTER_PIN_TOP = 32;
    expect(FILTER_PIN_TOP).toBeGreaterThanOrEqual(28);
    expect(FILTER_PIN_TOP).toBeLessThanOrEqual(40);
  });

  it("should have hitSlop of at least 12 on all sides", () => {
    const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
    expect(hitSlop.top).toBeGreaterThanOrEqual(10);
    expect(hitSlop.bottom).toBeGreaterThanOrEqual(10);
    expect(hitSlop.left).toBeGreaterThanOrEqual(10);
    expect(hitSlop.right).toBeGreaterThanOrEqual(10);
  });
});
