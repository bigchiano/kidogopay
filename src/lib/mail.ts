import "server-only";

type Email = { to: string; subject: string; heading: string; lines: string[]; action?: { label: string; url: string } };

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function render({ heading, lines, action }: Email) {
  const body = lines.map((l) => `<p style="margin:0 0 14px;line-height:1.55">${escape(l)}</p>`).join("");
  const button = action
    ? `<p style="margin:22px 0"><a href="${escape(action.url)}" style="background:#FFB61D;color:#141842;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">${escape(action.label)}</a></p>
       <p style="margin:0 0 14px;font-size:13px;color:#5A5F86;line-height:1.5">Or paste this link into your browser:<br>${escape(action.url)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#F3F4F9;font-family:Arial,Helvetica,sans-serif;color:#141842">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:800;font-size:18px;letter-spacing:-0.02em;margin-bottom:24px">kidogopay</div>
    <div style="background:#fff;border:1px solid #DCDEEC;border-radius:16px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 16px">${escape(heading)}</h1>${body}${button}
    </div>
    <p style="font-size:12px;color:#5A5F86;margin-top:20px">kidogopay.xyz</p>
  </div></body></html>`;
}

function text({ heading, lines, action }: Email) {
  return [heading, "", ...lines, ...(action ? ["", `${action.label}: ${action.url}`] : [])].join("\n");
}

/** Sends through Resend when RESEND_API_KEY is set; otherwise prints to the server console. */
export async function sendEmail(email: Email) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`\n[email] to: ${email.to}\n[email] subject: ${email.subject}\n${text(email)}\n`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "KidogoPay <hello@kidogopay.xyz>",
        to: email.to,
        subject: email.subject,
        html: render(email),
        text: text(email),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[email] send failed", res.status, await res.text());
  } catch (err) {
    console.error("[email] send failed", err);
  }
}

export const appUrl = (path = "") =>
  `${(process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;
