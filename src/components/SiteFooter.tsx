import Link from "next/link";
import { Mark } from "./Wordmark";

/** National footer. LGA pages add their own line above it through `lead`. */
export function SiteFooter({ lead }: { lead?: React.ReactNode }) {
  return (
    <footer className="site-footer">
      <div className="wrap py-12 grid gap-10">
        {lead ? <div className="measure">{lead}</div> : null}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="grid gap-3 content-start max-w-sm">
            <Link href="/" className="wordmark" aria-label="AskLGA home"><Mark /><span>AskLGA</span></Link>
            <p>
              A public-interest answer service for Nigeria&apos;s 774 local government areas. Free for residents and councils, open source under the MIT licence, council registers open under CC BY 4.0; national datasets under their publishers&apos; terms.
            </p>
          </div>
          <div>
            <h2>For residents</h2>
            <ul>
              <li><Link href="/">Find your LGA</Link></li>
              <li><Link href="/money">Money to local governments</Link></li>
              <li><Link href="/compare">Compare LGAs</Link></li>
              <li><Link href="/about-answers">How answers are checked</Link></li>
            </ul>
          </div>
          <div>
            <h2>Open data</h2>
            <ul>
              <li><Link href="/standard">The LGA Record Standard</Link></li>
              <li><Link href="/api/catalogue.json">Data catalogue (DCAT)</Link></li>
              <li><Link href="/scoreboard">Accuracy scoreboard</Link></li>
              <li><Link href="/insights">What people ask</Link></li>
            </ul>
          </div>
          <div>
            <h2>For government</h2>
            <ul>
              <li><Link href="/join">Join as an LGA</Link></li>
              <li><Link href="/admin">Staff sign-in</Link></li>
            </ul>
          </div>
          <div>
            <h2>About</h2>
            <ul>
              <li><Link href="/about">About AskLGA</Link></li>
              <li><Link href="/about#sources">Data sources</Link></li>
              <li><Link href="/about#contact">Contact</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
