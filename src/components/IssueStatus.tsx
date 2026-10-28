import { ISSUE_STATUS_LABEL, type IssueStatus as Status } from "@/lib/participationRules";

const CLASS: Record<Status, string> = {
  received: "status-received",
  acknowledged: "status-ongoing",
  in_progress: "status-ongoing",
  resolved: "status-completed",
  not_council: "status-planned",
  closed: "status-planned",
};

export function IssueStatusMark({ status }: { status: string }) {
  const st = (status in ISSUE_STATUS_LABEL ? status : "received") as Status;
  return <span className={`status ${CLASS[st]}`}>{ISSUE_STATUS_LABEL[st]}</span>;
}

export function issueStatusLabel(status: string): string {
  return ISSUE_STATUS_LABEL[(status in ISSUE_STATUS_LABEL ? status : "received") as Status];
}
