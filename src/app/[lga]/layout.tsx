import { notFound } from "next/navigation";
import { getLga } from "@/lib/queries";

/**
 * Checks the LGA exists before any page or loading state streams, so an unknown address
 * returns a real 404 status instead of a 200 with a "not found" message inside it.
 */
export default async function LgaLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  if (!(await getLga(lga))) notFound();
  return children;
}
