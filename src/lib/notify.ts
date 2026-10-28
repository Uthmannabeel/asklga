/**
 * Outbound alerts for things an officer must act on: a new ticket, a flagged answer, an investor
 * enquiry. Three optional channels, any combination, all over plain HTTPS so no SDK is needed:
 *   - ALERT_WEBHOOK_URL                      POST JSON {kind, lgaId, title, body, link}
 *   - RESEND_API_KEY + ALERT_EMAIL_TO         email through resend.com (ALERT_EMAIL_FROM optional)
 *   - TERMII_API_KEY + TERMII_SENDER_ID + ALERT_SMS_TO   SMS through termii.com (Nigerian numbers)
 * Sending is fire-and-forget: a failed alert is logged and never blocks the resident's request.
 */
export type Alert = { kind: "ticket" | "flag" | "enquiry" | "issue"; lgaId: string; title: string; body: string; link: string };

let warnedNoChannel = false;

async function withTimeout(url: string, init: RequestInit, ms = 6000): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

export function alertChannels(): string[] {
  const out: string[] = [];
  if (process.env.ALERT_WEBHOOK_URL) out.push("webhook");
  if (process.env.RESEND_API_KEY && process.env.ALERT_EMAIL_TO) out.push("email");
  if (process.env.TERMII_API_KEY && process.env.TERMII_SENDER_ID && process.env.ALERT_SMS_TO) out.push("sms");
  return out;
}

export function notify(alert: Alert): void {
  const channels = alertChannels();
  if (!channels.length) {
    if (!warnedNoChannel) {
      warnedNoChannel = true;
      console.warn("[notify] no alert channel configured (ALERT_WEBHOOK_URL, RESEND_API_KEY, TERMII_API_KEY); tickets, flags and enquiries will only appear in the workspace.");
    }
    return;
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const link = alert.link.startsWith("http") ? alert.link : `${base}${alert.link}`;
  const text = `${alert.title}\n${alert.body}\n${link}`;
  const jobs: Promise<unknown>[] = [];

  if (channels.includes("webhook")) {
    jobs.push(
      withTimeout(process.env.ALERT_WEBHOOK_URL as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...alert, link, text }),
      }).then((r) => {
        if (!r.ok) throw new Error(`webhook ${r.status}`);
      }),
    );
  }
  if (channels.includes("email")) {
    jobs.push(
      withTimeout("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: process.env.ALERT_EMAIL_FROM ?? "AskLGA <alerts@resend.dev>",
          to: (process.env.ALERT_EMAIL_TO as string).split(",").map((s) => s.trim()),
          subject: `[${alert.lgaId}] ${alert.title}`,
          text,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error(`email ${r.status}`);
      }),
    );
  }
  if (channels.includes("sms")) {
    for (const to of (process.env.ALERT_SMS_TO as string).split(",").map((s) => s.trim()).filter(Boolean)) {
      jobs.push(
        withTimeout("https://api.ng.termii.com/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: process.env.TERMII_API_KEY,
            to,
            from: process.env.TERMII_SENDER_ID,
            sms: `${alert.title}. ${alert.body}`.slice(0, 300),
            type: "plain",
            channel: "generic",
          }),
        }).then((r) => {
          if (!r.ok) throw new Error(`sms ${r.status}`);
        }),
      );
    }
  }
  void Promise.allSettled(jobs).then((results) => {
    for (const r of results) if (r.status === "rejected") console.error("[notify] alert failed:", r.reason instanceof Error ? r.reason.message : r.reason);
  });
}
