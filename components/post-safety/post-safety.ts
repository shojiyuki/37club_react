import type { AppReportReason, CreateReportInput } from "../../lib/data/types";

export type ReportSelection =
  | { targetType: "post"; targetId: string; targetLabel: "投稿" }
  | { targetType: "user"; targetId: string; targetLabel: "ユーザー" };

type PostSafetyTargetInput = {
  targetId: string;
  userId: string;
};

export type PostSafetyTarget = {
  contentReport: ReportSelection;
  userReport: ReportSelection;
  blockUserId: string;
};

export type PostSafetyFlowStage =
  | { type: "none" }
  | { type: "menu"; target: PostSafetyTarget; sessionKey: string }
  | { type: "report"; selection: ReportSelection; sessionKey: string }
  | { type: "block"; targetUserId: string; sessionKey: string };

export type PostSafetyFlowEffect =
  | { type: "show_report_success"; sessionKey: string }
  | { type: "close_post_sheet"; sessionKey: string };

export type PostSafetyFlowState = {
  stage: PostSafetyFlowStage;
  effect: PostSafetyFlowEffect | null;
};

export type PostSafetyFlowEvent =
  | { type: "reset" }
  | { type: "close_stage" }
  | { type: "open_menu"; target: PostSafetyTarget; sessionKey: string }
  | { type: "open_report"; selection: ReportSelection; sessionKey: string }
  | { type: "open_block"; targetUserId: string; sessionKey: string }
  | { type: "report_succeeded"; targetKey: string; sessionKey: string }
  | { type: "block_succeeded"; targetUserId: string; sessionKey: string }
  | { type: "effect_handled"; effect: PostSafetyFlowEffect };

type PostSafetySessionKeyParams = {
  visible: boolean;
  postId: string | null | undefined;
};

export function createPostSafetySessionKey({
  visible,
  postId,
}: PostSafetySessionKeyParams) {
  return JSON.stringify([visible ? "visible" : "hidden", postId ?? null]);
}

export function createPostSafetyTarget({
  targetId,
  userId,
}: PostSafetyTargetInput): PostSafetyTarget {
  return {
    contentReport: { targetType: "post", targetId, targetLabel: "投稿" },
    userReport: {
      targetType: "user",
      targetId: userId,
      targetLabel: "ユーザー",
    },
    blockUserId: userId,
  };
}

export function getReportTargetKey(selection: ReportSelection) {
  return `${selection.targetType}:${selection.targetId}`;
}

export function createInitialPostSafetyFlowState(): PostSafetyFlowState {
  return { stage: { type: "none" }, effect: null };
}

export function canRequestPostSheetClose(state: PostSafetyFlowState) {
  return state.stage.type === "none";
}

export function getPostSafetyFlowEffectForSession(
  state: PostSafetyFlowState,
  sessionKey: string,
) {
  return state.effect?.sessionKey === sessionKey ? state.effect : null;
}

export function reducePostSafetyFlow(
  state: PostSafetyFlowState,
  event: PostSafetyFlowEvent,
): PostSafetyFlowState {
  switch (event.type) {
    case "reset":
      return createInitialPostSafetyFlowState();
    case "close_stage":
      return { ...state, stage: { type: "none" } };
    case "open_menu":
      return {
        stage: {
          type: "menu",
          target: event.target,
          sessionKey: event.sessionKey,
        },
        effect: null,
      };
    case "open_report":
      return {
        stage: {
          type: "report",
          selection: event.selection,
          sessionKey: event.sessionKey,
        },
        effect: null,
      };
    case "open_block":
      return {
        stage: {
          type: "block",
          targetUserId: event.targetUserId,
          sessionKey: event.sessionKey,
        },
        effect: null,
      };
    case "report_succeeded":
      if (
        state.stage.type !== "report" ||
        getReportTargetKey(state.stage.selection) !== event.targetKey ||
        state.stage.sessionKey !== event.sessionKey
      ) {
        return state;
      }
      return {
        stage: { type: "none" },
        effect: {
          type: "show_report_success",
          sessionKey: event.sessionKey,
        },
      };
    case "block_succeeded":
      if (
        state.stage.type !== "block" ||
        state.stage.targetUserId !== event.targetUserId ||
        state.stage.sessionKey !== event.sessionKey
      ) {
        return state;
      }
      return {
        stage: { type: "none" },
        effect: { type: "close_post_sheet", sessionKey: event.sessionKey },
      };
    case "effect_handled":
      return state.effect === event.effect ? { ...state, effect: null } : state;
  }
}

type SubmitPostSafetyReportParams = {
  selection: ReportSelection;
  input: { reason: AppReportReason; details?: string };
  report: (input: CreateReportInput) => Promise<unknown>;
};

export async function submitPostSafetyReport({
  selection,
  input,
  report,
}: SubmitPostSafetyReportParams) {
  return report({
    targetType: selection.targetType,
    targetId: selection.targetId,
    ...input,
  });
}

type SubmitPostSafetyBlockParams = {
  targetUserId: string;
  blockUser: (input: { targetUserId: string }) => Promise<unknown>;
};

export async function submitPostSafetyBlock({
  targetUserId,
  blockUser,
}: SubmitPostSafetyBlockParams) {
  return blockUser({ targetUserId });
}
