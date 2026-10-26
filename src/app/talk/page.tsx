import { redirect } from "next/navigation";
import { directory } from "@/lib/national";

export const dynamic = "force-dynamic";

/** /talk opens the conversation with the pilot council; every council has its own at /{lga}/talk. */
export default async function Talk() {
  const rows = await directory();
  const demo = rows.find((r) => r.demo) ?? rows.find((r) => r.id === "obio-akpor") ?? rows.find((r) => r.records > 0);
  redirect(`/${demo?.id ?? "obio-akpor"}/talk`);
}
