export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

export const REPORT_STATUSES = [
  "pending",
  "action_taken",
  "dismissed",
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];
