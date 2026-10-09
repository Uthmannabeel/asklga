"use client";

import Link from "next/link";
import { useRef, useState } from "react";

/**
 * Real answers returned by the answer service for the Obio/Akpor records on 9 Oct 2026, copied
 * verbatim. Shown so a first-time visitor sees what an answer and its sources look like.
 */
const EXAMPLES = [
  {
    key: "en",
    tab: "English",
    lang: "en",
    q: "Has the new general hospital in Rumuigbo been commissioned?",
    a: "Yes, the new General Hospital in Rumuigbo has been commissioned. It was commissioned in late August 2026, specifically scheduled for 27 August 2026 by the Rivers State Government.",
    cites: [
      { id: "OBA-P-0003", kind: "Project", label: "New General Hospital, Rumuigbo" },
      { id: "OBA-D-0004", kind: "Notice", label: "State projects commissioned in Obio/Akpor, August 2026" },
    ],
  },
  {
    key: "pcm",
    tab: "Pidgin",
    lang: "pcm",
    q: "Wetin happen to the Okania-Ogbogoro road project?",
    a: "Governor Fubara flag off the 5 km Okania-Ogbogoro road on 25 May 2024 with a five-month timeline, and dem pay 40% advance of N2.69 billion to the contractor, China Civil Engineering Construction Corporation (CCECC) Nigeria Ltd. Radio Nigeria report on 30 Sep 2025 say work stop during the six-month emergency rule and residents dey appeal make dem finish am.",
    cites: [{ id: "OBA-P-0001", kind: "Project", label: "Okania–Ogbogoro road dualisation (5 km)" }],
  },
  {
    key: "ha",
    tab: "Hausa",
    lang: "ha",
    q: "Ta yaya zan biya kuɗin kasuwa da harajin ƙaramar hukumar Obio/Akpor?",
    a: "Za ka iya biyan kuɗin kasuwa da harajin ƙaramar hukuma ta hanyar amfani da shafin yanar gizon biyan kuɗi na majalisa wato TAMIS portal. Abin da za ka yi shi ne buɗe tamis.obioakpor.riversstateapps.ng, zaɓi nau'in harajin da kake so, sannan ka biya. Ofishin da abin ya shafa shi ne Revenue department a sakatariyar ƙaramar hukuma da ke Rumuodomaya, kuma za ka iya kiran lambar 0916 268 4923 daga Litinin zuwa Juma'a daga karfe takwas na safe zuwa shida na yamma.",
    cites: [{ id: "OBA-S-0003", kind: "Service", label: "Pay council rates, levies and permits online (TAMIS)" }],
  },
] as const;

export function AnswerSpecimen() {
  const [i, setI] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const ex = EXAMPLES[i];
  const move = (d: number) => {
    const n = (i + d + EXAMPLES.length) % EXAMPLES.length;
    setI(n);
    tabs.current[n]?.focus();
  };
  return (
    <figure className="specimen">
      <div className="specimen-tabs" role="tablist" aria-label="Example answers by language">
        {EXAMPLES.map((e, n) => (
          <button
            key={e.key}
            ref={(el) => { tabs.current[n] = el; }}
            role="tab"
            id={`spec-tab-${e.key}`}
            aria-controls="spec-panel"
            aria-selected={n === i}
            tabIndex={n === i ? 0 : -1}
            onClick={() => setI(n)}
            onKeyDown={(k) => {
              if (k.key === "ArrowRight") { k.preventDefault(); move(1); }
              if (k.key === "ArrowLeft") { k.preventDefault(); move(-1); }
            }}
          >
            {e.tab}
          </button>
        ))}
      </div>
      <div id="spec-panel" role="tabpanel" aria-labelledby={`spec-tab-${ex.key}`} className="p-5 md:p-6 grid gap-4">
        <div className="grid gap-1">
          <p className="eyebrow">Question to Obio/Akpor LGA</p>
          <p className="specimen-q" lang={ex.lang}>{ex.q}</p>
        </div>
        <div className="grid gap-1">
          <p className="eyebrow">Answer</p>
          <p lang={ex.lang} style={{ lineHeight: 1.6 }}>{ex.a}</p>
        </div>
        <div>
          <p className="eyebrow mb-1">From {ex.cites.length === 1 ? "this record" : "these records"}</p>
          {ex.cites.map((c) => (
            <div key={c.id} className="cite">
              <span className="mono">{c.id}</span>
              <span>{c.label} <span className="muted">· {c.kind}</span></span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="px-5 md:px-6 py-3 small muted" style={{ borderTop: "1px solid var(--rule)", background: "var(--canvas)" }}>
        Real answers from records compiled from public sources. <Link href="/obio-akpor">Ask Obio/Akpor your own question</Link>
      </figcaption>
    </figure>
  );
}
