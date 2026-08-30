import React from "react";

import type { CreateReportInput } from "../../lib/data/types";
import { PostSafetyInlineStage } from "./PostSafetyInlineStage";
import {
  canRequestPostSheetClose,
  createInitialPostSafetyFlowState,
  createPostSafetySessionKey,
  getPostSafetyFlowEffectForSession,
  reducePostSafetyFlow,
  type PostSafetyFlowEffect,
  type PostSafetyTarget,
} from "./post-safety";

export type UsePostSafetyFlowParams = {
  visible: boolean;
  postId: string | null | undefined;
  isMutualPost: boolean;
  report: (input: CreateReportInput) => Promise<unknown>;
  blockUser: (input: { targetUserId: string }) => Promise<unknown>;
  onUnfollow: () => void;
  onReportSuccess: () => void;
  onClose: () => void;
};

export type UsePostSafetyFlowResult = {
  inlineStage: React.ReactElement | null;
  openMenu: (target: PostSafetyTarget) => void;
  requestClose: () => void;
};

export function usePostSafetyFlow({
  visible,
  postId,
  isMutualPost,
  report,
  blockUser,
  onUnfollow,
  onReportSuccess,
  onClose,
}: UsePostSafetyFlowParams): UsePostSafetyFlowResult {
  const [state, dispatch] = React.useReducer(
    reducePostSafetyFlow,
    undefined,
    createInitialPostSafetyFlowState,
  );
  const handledEffect = React.useRef<PostSafetyFlowEffect | null>(null);
  const sessionKey = createPostSafetySessionKey({ visible, postId });

  React.useEffect(() => {
    dispatch({ type: "reset" });
  }, [sessionKey]);

  React.useEffect(() => {
    const effect = state.effect;
    if (!effect || handledEffect.current === effect) return;
    handledEffect.current = effect;
    dispatch({ type: "effect_handled", effect });

    const currentEffect = getPostSafetyFlowEffectForSession(state, sessionKey);
    if (!currentEffect) return;

    if (currentEffect.type === "show_report_success") {
      onReportSuccess();
    } else {
      onClose();
    }
  }, [onClose, onReportSuccess, sessionKey, state]);

  const openMenu = React.useCallback(
    (target: PostSafetyTarget) => {
      dispatch({ type: "open_menu", target, sessionKey });
    },
    [sessionKey],
  );

  const requestClose = React.useCallback(() => {
    if (!canRequestPostSheetClose(state)) return;
    onClose();
  }, [onClose, state]);

  const handleUnfollow = React.useCallback(() => {
    dispatch({ type: "close_stage" });
    onUnfollow();
  }, [onUnfollow]);

  return {
    inlineStage: (
      <PostSafetyInlineStage
        state={state}
        sessionKey={sessionKey}
        isMutualPost={isMutualPost}
        report={report}
        blockUser={blockUser}
        dispatch={dispatch}
        onUnfollow={handleUnfollow}
      />
    ),
    openMenu,
    requestClose,
  };
}
