const LABEL: Record<string, string> = {
  planned: "Planned",
  ongoing: "In progress",
  completed: "Completed",
  stalled: "Stalled",
  abandoned: "Abandoned",
  unknown: "Status unknown",
};

export function StatusMark({ status }: { status: string }) {
  return <span className={`status status-${status}`}>{LABEL[status] ?? status}</span>;
}

export function statusLabel(status: string): string {
  return LABEL[status] ?? status;
}
