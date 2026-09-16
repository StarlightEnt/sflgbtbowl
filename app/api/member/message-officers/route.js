import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { isMember } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";

// Same verified sender the magic-link/pre-bowl emails use.
const FROM_ADDRESS = "officers@sflgbtbowl.com";
const OFFICERS_ADDRESS = "officers@sflgbtbowl.com";

// This route, not the form, is the real security boundary. Sender
// name/email come from the signed-in session, never from the request
// body — the form has no free-text sender fields at all.
export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isMember(email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { subject, message } = await req.json();
  const trimmedSubject = (subject ?? "").trim();
  const trimmedMessage = (message ?? "").trim();
  if (!trimmedSubject || !trimmedMessage) {
    return Response.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const bowlerRows = await sql`SELECT first_name, last_name FROM bowlers WHERE email = ${email}`;
  const senderName = bowlerRows[0]
    ? `${bowlerRows[0].first_name} ${bowlerRows[0].last_name}`
    : session.user?.name || email;

  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: OFFICERS_ADDRESS,
    replyTo: email,
    subject: `[Member message] ${trimmedSubject}`,
    text: `From: ${senderName} <${email}>\n\n${trimmedMessage}`,
  });

  return Response.json({ ok: true });
}
