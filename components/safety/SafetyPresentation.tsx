import React, { type ReactNode } from "react";
import { Modal } from "react-native";

export type SafetyPresentationMode = "modal" | "inline";

export type SafetyPresentationProps = {
  presentation?: SafetyPresentationMode;
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
};

export function SafetyPresentation({
  presentation = "modal",
  visible,
  onRequestClose,
  children,
}: SafetyPresentationProps) {
  if (presentation === "inline") {
    return visible ? <>{children}</> : null;
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onRequestClose}
    >
      {children}
    </Modal>
  );
}
