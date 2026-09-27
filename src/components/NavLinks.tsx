"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Nav links that mark the current page. `exact` items only match their own path. */
export function NavLinks({ items, className, label }: { items: { href: string; label: string; exact?: boolean }[]; className: string; label: string }) {
  const path = usePathname() ?? "/";
  return (
    <nav aria-label={label} className={className}>
      {items.map((it) => {
        const current = it.exact ? path === it.href : path === it.href || path.startsWith(`${it.href}/`);
        return (
          <Link key={it.href} href={it.href} aria-current={current ? "page" : undefined}>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
