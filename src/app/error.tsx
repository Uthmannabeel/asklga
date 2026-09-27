"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Replaces the framework's blank error screen with a page that still has a way home. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="wrap py-16 grid gap-4 measure">
      <h1>Something went wrong on our side</h1>
      <p>The page could not be shown. Nothing you typed was lost from the LGA&apos;s records. You can try again, or go back to the start.</p>
      {error.digest ? <p className="small muted">Reference: {error.digest}</p> : null}
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={() => reset()}>Try again</button>
        <Link href="/" className="btn btn-quiet">Home</Link>
      </div>
    </main>
  );
}
