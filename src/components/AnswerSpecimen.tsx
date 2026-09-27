"use client";

import Link from "next/link";
import { useRef, useState } from "react";

/**
 * Real answers returned by the live service for the Obio/Akpor demo records on 27 Sep 2026,
 * copied verbatim. Shown so a first-time visitor sees what an answer and its sources look like.
 */
const EXAMPLES = [
  {
    key: "en",
    tab: "English",
    lang: "en",
    q: "How do I register a business in Obio/Akpor and what does it cost?",
    a: "To register a business in Obio/Akpor, submit your CAC certificate or business name, a utility bill or tenancy agreement, and your ID at the Revenue department. A revenue officer will inspect the premises. After that, collect your registration certificate. The records do not state the cost.",
    cites: [{ id: "OBA-S-0003", kind: "Service", label: "Business premises registration" }],
  },
  {
    key: "pcm",
    tab: "Pidgin",
    lang: "pcm",
    q: "Wetin I go do to get market stall for Obio/Akpor?",
    a: "To get market stall, you need to apply at the Markets unit. Your name go join the waiting list for that market, and the market master go notify you when stall free. Do not pay any person for stall.",
    cites: [
      { id: "OBA-S-0004", kind: "Service", label: "Market stall allocation" },
      { id: "OBA-D-0002", kind: "Notice", label: "Council notice: market stall waiting lists" },
    ],
  },
  {
    key: "ha",
    tab: "Hausa",
    lang: "ha",
    q: "Ina ake yin rijistar haihuwa?",
    a: "Ana yin rijistar haihuwa ta gaske a wurin Hukumar Kula da Yawan Jama'a ta Kasa (National Population Commission). Amma idan kuna son samun takardar shaida daga kananan hukumomi (birth attestation letter), ana yi a Ofishin Rijista da ke Sakatariyar Karamar Hukumar Rumuodomaya.",
    cites: [{ id: "OBA-S-0005", kind: "Service", label: "Birth attestation letter" }],
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
          <p className="eyebrow mb-1">From {ex.cites.length === 1 ? "this approved record" : "these approved records"}</p>
          {ex.cites.map((c) => (
            <div key={c.id} className="cite">
              <span className="mono">{c.id}</span>
              <span>{c.label} <span className="muted">· {c.kind}</span></span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="px-5 md:px-6 py-3 small muted" style={{ borderTop: "1px solid var(--rule)", background: "var(--canvas)" }}>
        Real answers from the demo records. <Link href="/obio-akpor">Ask Obio/Akpor your own question</Link>
      </figcaption>
    </figure>
  );
}
