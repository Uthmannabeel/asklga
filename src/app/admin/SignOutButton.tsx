"use client";

import { signOutAction } from "./actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="btn btn-quiet btn-sm">Sign out</button>
    </form>
  );
}
