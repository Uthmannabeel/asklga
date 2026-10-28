import type { OfficialRole } from "@/db/schema";

export const ROLE_LABEL: Record<OfficialRole, string> = {
  chairman: "Chairman",
  vice_chairman: "Vice Chairman",
  leader: "Leader of the Legislative Council",
  secretary: "Secretary to the Local Government",
  hlga: "Head of Local Government Administration",
  treasurer: "Treasurer",
  councillor: "Councillor",
  other: "Other office",
};
