export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

export type EmailTransport = {
  name: string;
  send(payload: EmailPayload): Promise<{ ok: boolean; id?: string; error?: string }>;
};

/**
 * Dev transport writes to the console and stores the message in memory so the
 * UI can surface it. Swap for Resend/SES in production via EMAIL_PROVIDER.
 */
class ConsoleTransport implements EmailTransport {
  name = "console";
  outbox: EmailPayload[] = [];

  async send(payload: EmailPayload) {
    this.outbox.push(payload);
    if (this.outbox.length > 50) this.outbox.shift();
    console.log(`[email] to=${payload.to} subject=${payload.subject}`);
    return { ok: true, id: `dev-${Date.now()}` };
  }
}

/** Resend transport. Requires RESEND_API_KEY. */
class ResendTransport implements EmailTransport {
  name = "resend";

  async send(payload: EmailPayload) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, error: "RESEND_API_KEY is not set" };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from ?? "AdmissionDeck <onboarding@resend.dev>",
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  }
}

let transport: EmailTransport | null = null;

function getTransport(): EmailTransport {
  if (transport) return transport;
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  transport = provider === "resend" ? new ResendTransport() : new ConsoleTransport();
  return transport;
}

export async function sendEmail(payload: EmailPayload) {
  return getTransport().send(payload);
}

export function getEmailOutbox(): EmailPayload[] {
  const t = getTransport();
  return t instanceof ConsoleTransport ? t.outbox : [];
}

export function inviteEmail(opts: {
  to: string;
  name: string;
  orgName: string;
  token: string;
  acceptUrl: string;
}): EmailPayload {
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#2F3338">
      <p>Hi ${escapeHtml(opts.name)},</p>
      <p>
        You have been invited to join <strong>${escapeHtml(opts.orgName)}</strong>
        on AdmissionDeck CRM.
      </p>
      <p>
        <a href="${escapeHtml(opts.acceptUrl)}"
           style="background:#E2555A;color:#fff;padding:10px 16px;text-decoration:none;display:inline-block">
          Accept invitation
        </a>
      </p>
      <p>Or open this link:</p>
      <p style="word-break:break-all">${escapeHtml(opts.acceptUrl)}</p>
      <p style="color:#6E7378;font-size:13px">
        This invite expires in 7 days. If you were not expecting it, you can ignore this email.
      </p>
    </div>
  `;
  const text = `Hi ${opts.name},\n\nYou have been invited to join ${opts.orgName} on AdmissionDeck CRM.\n\nAccept: ${opts.acceptUrl}\n\nThis invite expires in 7 days.`;

  return {
    to: opts.to,
    subject: `You are invited to ${opts.orgName} on AdmissionDeck`,
    html,
    text,
  };
}

export function resetPasswordEmail(opts: {
  to: string;
  name: string;
  token: string;
  resetUrl: string;
}): EmailPayload {
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#2F3338">
      <p>Hi ${escapeHtml(opts.name)},</p>
      <p>Use the link below to choose a new password for AdmissionDeck CRM.</p>
      <p>
        <a href="${escapeHtml(opts.resetUrl)}"
           style="background:#E2555A;color:#fff;padding:10px 16px;text-decoration:none;display:inline-block">
          Reset password
        </a>
      </p>
      <p>Or open this link:</p>
      <p style="word-break:break-all">${escapeHtml(opts.resetUrl)}</p>
      <p style="color:#6E7378;font-size:13px">
        This link expires in 30 minutes and can only be used once.
        If you did not request this, you can ignore this email.
      </p>
    </div>
  `;
  const text = `Hi ${opts.name},\n\nReset your password: ${opts.resetUrl}\n\nThis link expires in 30 minutes.`;

  return {
    to: opts.to,
    subject: "Reset your AdmissionDeck password",
    html,
    text,
  };
}

export function welcomeEmail(opts: {
  to: string;
  name: string;
  orgName: string;
  loginUrl: string;
}): EmailPayload {
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#2F3338">
      <p>Hi ${escapeHtml(opts.name)},</p>
      <p>Your AdmissionDeck account for <strong>${escapeHtml(opts.orgName)}</strong> is ready.</p>
      <p>
        <a href="${escapeHtml(opts.loginUrl)}"
           style="background:#E2555A;color:#fff;padding:10px 16px;text-decoration:none;display:inline-block">
          Sign in
        </a>
      </p>
    </div>
  `;
  return {
    to: opts.to,
    subject: `Welcome to AdmissionDeck`,
    html,
    text: `Hi ${opts.name}, your account for ${opts.orgName} is ready. Sign in: ${opts.loginUrl}`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
