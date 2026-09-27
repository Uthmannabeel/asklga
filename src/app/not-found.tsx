import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="wrap py-16 grid gap-3 measure">
        <h1>That record is not here.</h1>
        <p>The address may be wrong, or the record has not been approved for publication yet.</p>
        <p><Link href="/">Choose a local government area</Link></p>
      </main>
      <SiteFooter />
    </>
  );
}
