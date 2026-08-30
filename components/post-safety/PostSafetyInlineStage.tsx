import type { CreateReportInput } from "../../lib/data/types";
import { BlockConfirmDialog, ReportSheet, SafetyActionMenu } from "../safety";
import {
  getReportTargetKey,
  submitPostSafetyBlock,
  submitPostSafetyReport,
  type PostSafetyFlowEvent,
  type PostSafetyFlowState,
} from "./post-safety";

type PostSafetyInlineStageProps = {
  state: PostSafetyFlowState;
  sessionKey: string;
  isMutualPost: boolean;
  report: (input: CreateReportInput) => Promise<unknown>;
  blockUser: (input: { targetUserId: string }) => Promise<unknown>;
  dispatch: (event: PostSafetyFlowEvent) => void;
  onUnfollow: () => void;
};

export function PostSafetyInlineStage({
  state,
  sessionKey,
  isMutualPost,
  report,
  blockUser,
  dispatch,
  onUnfollow,
}: PostSafetyInlineStageProps) {
  const { stage } = state;
  const visible = stage.type !== "none" && stage.sessionKey === sessionKey;

  if (stage.type === "menu") {
    const { target } = stage;
    return (
      <SafetyActionMenu
        visible={visible}
        presentation="inline"
        contentReportLabel="投稿を通報"
        onReportContent={() =>
          dispatch({
            type: "open_report",
            selection: target.contentReport,
            sessionKey: stage.sessionKey,
          })
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
        onUnfollow={isMutualPost ? onUnfollow : undefined}
        onClose={() => dispatch({ type: "close_stage" })}
      />
    );
  }

  if (stage.type === "report") {
    const targetKey = getReportTargetKey(stage.selection);
    return (
      <ReportSheet
        visible={visible}
        sessionKey={sessionKey}
        presentation="inline"
        targetKey={targetKey}
        targetLabel={stage.selection.targetLabel}
        onSubmit={(input) =>
          submitPostSafetyReport({
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
        presentation="inline"
        mode="block"
        onConfirm={() =>
          submitPostSafetyBlock({
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
