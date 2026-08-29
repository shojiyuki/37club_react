import type {
  AppChatMessage,
  AppReportReason,
  CreateReportInput,
} from "../../lib/data/types";

export type ChatSafetyReportSelection =
  | { targetType: "message"; targetId: string; targetLabel: "メッセージ" }
  | { targetType: "user"; targetId: string; targetLabel: "ユーザー" };

export type ChatMessageSafetyTarget = {
  contentReport: Extract<ChatSafetyReportSelection, { targetType: "message" }>;
  userReport: Extract<ChatSafetyReportSelection, { targetType: "user" }>;
  blockUserId: string;
};

export type ChatUserSafetyTarget = {
  userReport: Extract<ChatSafetyReportSelection, { targetType: "user" }>;
  blockUserId: string;
};

export type ChatSafetyTarget = ChatMessageSafetyTarget | ChatUserSafetyTarget;

export type ChatSafetyFlowStage =
  | { type: "none" }
  | { type: "menu"; target: ChatSafetyTarget; sessionKey: string }
  | {
      type: "report";
      selection: ChatSafetyReportSelection;
      sessionKey: string;
    }
  | { type: "block"; targetUserId: string; sessionKey: string };

export type ChatSafetyFlowEffect =
  | { type: "show_report_success"; sessionKey: string }
  | { type: "close_chat"; sessionKey: string };

export type ChatSafetyFlowState = {
  stage: ChatSafetyFlowStage;
  effect: ChatSafetyFlowEffect | null;
};

export type ChatSafetyFlowEvent =
  | { type: "reset" }
  | { type: "close_stage" }
  | { type: "open_menu"; target: ChatSafetyTarget; sessionKey: string }
  | {
      type: "open_report";
      selection: ChatSafetyReportSelection;
      sessionKey: string;
    }
  | { type: "open_block"; targetUserId: string; sessionKey: string }
  | { type: "report_succeeded"; targetKey: string; sessionKey: string }
  | { type: "block_succeeded"; targetUserId: string; sessionKey: string }
  | { type: "effect_handled"; effect: ChatSafetyFlowEffect };

type ChatAccessErrorCode = "USER_BLOCKED";

const CHAT_ACCESS_ERROR_CODES = new Set<ChatAccessErrorCode>(["USER_BLOCKED"]);

export function isChatUserBlockedError(error: unknown) {
  return (
    error instanceof Error &&
    CHAT_ACCESS_ERROR_CODES.has(error.message as ChatAccessErrorCode)
  );
}

export async function sendChatMessageWithBlockHandling({
  sendMessage,
  text,
  onSent,
  onUserBlocked,
}: {
  sendMessage: (text: string) => Promise<unknown>;
  text: string;
  onSent: () => void;
  onUserBlocked: () => void;
}) {
  try {
    await sendMessage(text);
    onSent();
    return "sent" as const;
  } catch (error) {
    if (isChatUserBlockedError(error)) {
      onUserBlocked();
      return "user_blocked" as const;
    }
    throw error;
  }
}

export function createChatSafetySessionKey({ userId }: { userId: string }) {
  return JSON.stringify(["chat", userId || null]);
}

export function createChatMessageSafetyTarget(
  message: Pick<AppChatMessage, "id" | "senderId">,
): ChatMessageSafetyTarget {
  return {
    contentReport: {
      targetType: "message",
      targetId: message.id,
      targetLabel: "メッセージ",
    },
    userReport: {
      targetType: "user",
      targetId: message.senderId,
      targetLabel: "ユーザー",
    },
    blockUserId: message.senderId,
  };
}

export function createChatUserSafetyTarget(
  userId: string,
): ChatUserSafetyTarget {
  return {
    userReport: {
      targetType: "user",
      targetId: userId,
      targetLabel: "ユーザー",
    },
    blockUserId: userId,
  };
}

export function getChatReportTargetKey(selection: ChatSafetyReportSelection) {
  return `${selection.targetType}:${selection.targetId}`;
}

export function createInitialChatSafetyFlowState(): ChatSafetyFlowState {
  return { stage: { type: "none" }, effect: null };
}

export function getChatSafetyFlowEffectForSession(
  state: ChatSafetyFlowState,
  sessionKey: string,
) {
  return state.effect?.sessionKey === sessionKey ? state.effect : null;
}

export function reduceChatSafetyFlow(
  state: ChatSafetyFlowState,
  event: ChatSafetyFlowEvent,
): ChatSafetyFlowState {
  switch (event.type) {
    case "reset":
      return createInitialChatSafetyFlowState();
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
        getChatReportTargetKey(state.stage.selection) !== event.targetKey ||
        state.stage.sessionKey !== event.sessionKey
      ) {
        return state;
      }
      return {
        stage: { type: "none" },
        effect: { type: "show_report_success", sessionKey: event.sessionKey },
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
        effect: { type: "close_chat", sessionKey: event.sessionKey },
      };
    case "effect_handled":
      return state.effect === event.effect ? { ...state, effect: null } : state;
  }
}

export async function submitChatSafetyReport({
  selection,
  input,
  report,
}: {
  selection: ChatSafetyReportSelection;
  input: { reason: AppReportReason; details?: string };
  report: (input: CreateReportInput) => Promise<unknown>;
}) {
  return report({
    targetType: selection.targetType,
    targetId: selection.targetId,
    ...input,
  });
}

export async function submitChatSafetyBlock({
  targetUserId,
  blockUser,
}: {
  targetUserId: string;
  blockUser: (input: { targetUserId: string }) => Promise<unknown>;
}) {
  return blockUser({ targetUserId });
}
