import type { CreateReportInput } from "../../lib/data/types";
import { BlockConfirmDialog, ReportSheet, SafetyActionMenu } from "../safety";
import {
  getChatReportTargetKey,
  submitChatSafetyBlock,
  submitChatSafetyReport,
  type ChatSafetyFlowEvent,
  type ChatSafetyFlowState,
} from "./chat-safety";

type ChatSafetyStageProps = {
  state: ChatSafetyFlowState;
  sessionKey: string;
  report: (input: CreateReportInput) => Promise<unknown>;
  blockUser: (input: { targetUserId: string }) => Promise<unknown>;
  dispatch: (event: ChatSafetyFlowEvent) => void;
};

export function ChatSafetyStage({
  state,
  sessionKey,
  report,
  blockUser,
  dispatch,
}: ChatSafetyStageProps) {
  const { stage } = state;
  const visible = stage.type !== "none" && stage.sessionKey === sessionKey;

  if (stage.type === "menu") {
    const { target } = stage;
    return (
      <SafetyActionMenu
        visible={visible}
        contentReportLabel={
          "contentReport" in target ? "メッセージを通報" : undefined
        }
        onReportContent={
          "contentReport" in target
            ? () =>
                dispatch({
                  type: "open_report",
                  selection: target.contentReport,
                  sessionKey: stage.sessionKey,
                })
            : undefined
        }
        onReportUser={() =>
          dispatch({
            type: "open_report",
            selection: target.userReport,
            sessionKey: stage.sessionKey,
          })
        }
        onBlockUser={() =>
          dispatch({
            type: "open_block",
            targetUserId: target.blockUserId,
            sessionKey: stage.sessionKey,
          })
        }
        onClose={() => dispatch({ type: "close_stage" })}
      />
    );
  }

  if (stage.type === "report") {
    const targetKey = getChatReportTargetKey(stage.selection);
    return (
      <ReportSheet
        visible={visible}
        sessionKey={sessionKey}
        targetKey={targetKey}
        targetLabel={stage.selection.targetLabel}
        onSubmit={(input) =>
          submitChatSafetyReport({
            selection: stage.selection,
            input,
            report,
          })
        }
        onSuccess={() =>
          dispatch({
            type: "report_succeeded",
            targetKey,
            sessionKey: stage.sessionKey,
          })
        }
        onClose={() => dispatch({ type: "close_stage" })}
      />
    );
  }

  if (stage.type === "block") {
    return (
      <BlockConfirmDialog
        visible={visible}
        sessionKey={sessionKey}
        mode="block"
        onConfirm={() =>
          submitChatSafetyBlock({
            targetUserId: stage.targetUserId,
            blockUser,
          })
        }
        onSuccess={() =>
          dispatch({
            type: "block_succeeded",
            targetUserId: stage.targetUserId,
            sessionKey: stage.sessionKey,
          })
        }
        onClose={() => dispatch({ type: "close_stage" })}
      />
    );
  }

  return null;
}
