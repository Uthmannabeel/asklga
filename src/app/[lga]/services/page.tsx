import Link from "next/link";
import { LgaShell } from "@/components/LgaShell";
import { listServices } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services" };

export default async function ServicesPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const services = await listServices(lga);
  const categories = [...new Set(services.map((s) => s.category))];
  return (
    <LgaShell lgaId={lga}>
      <section className="grid gap-2">
        <h1>Service directory</h1>
        <p className="measure">What the LGA does for residents and businesses, with the steps, the documents to bring, the office and who is responsible.</p>
      </section>
      {categories.map((cat) => (
        <section key={cat} className="grid gap-2">
          <h2>{cat}</h2>
          <ul className="register">
            {services.filter((s) => s.category === cat).map((s) => (
              <li key={s.id} className="register-row">
                <span className="id">{s.id}</span>
                <Link href={`/${lga}/services/${s.id}`} className="text-lg">{s.name}</Link>
                {s.summary ? <span className="small">{s.summary}</span> : null}
                <span className="small muted">{s.office ?? ""}{s.turnaround ? `. ${s.turnaround}.` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </LgaShell>
  );
}
