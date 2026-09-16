import { auth } from "@/lib/auth";
import { isAdmin, isMember } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getViewerContext(email) {
  const admin = await isAdmin(email);
  const rows = await sql`SELECT id FROM bowlers WHERE email = ${email}`;
  return { isAdminViewer: admin, viewerBowlerId: rows[0]?.id ?? null };
}

async function loadLeagues(bowlerId) {
  const rows = await sql`
    SELECT l.name AS league_name, lm.team_id, t.team_name, lm.real_average, lm.is_captain
    FROM league_memberships lm
    JOIN seasons s ON s.id = lm.season_id
    JOIN leagues l ON l.id = s.league_id
    LEFT JOIN teams t ON t.id = lm.team_id
    WHERE lm.bowler_id = ${bowlerId}
    ORDER BY s.id DESC
  `;
  return rows.map((r) => ({
    league: r.league_name,
    team: r.team_id ? r.team_name : "Substitute (not assigned to a team)",
    avg: Number(r.real_average) > 0 ? Number(r.real_average) : null,
    captain: r.is_captain,
  }));
}

// This route, not the modal's own read-only rendering, is the real
// privacy boundary — email/phone/usbc_id are only ever included in the
// response for your own card or an admin's view of anyone's, never
// present at all for a different member's card.
export async function GET(req, { params }) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isMember(email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const bowlerId = Number(id);
  if (!Number.isInteger(bowlerId)) {
    return Response.json({ error: "Invalid bowler id" }, { status: 400 });
  }

  const bowlerRows = await sql`
    SELECT id, first_name, last_name, nickname, email, phone, usbc_id
    FROM bowlers WHERE id = ${bowlerId}
  `;
  if (bowlerRows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const bowler = bowlerRows[0];

  const { isAdminViewer, viewerBowlerId } = await getViewerContext(email);
  const editable = isAdminViewer || viewerBowlerId === bowlerId;
  const leagues = await loadLeagues(bowlerId);

  const base = {
    id: bowler.id,
    firstName: bowler.first_name,
    lastName: bowler.last_name,
    nickname: bowler.nickname,
    editable,
    leagues,
  };

  if (!editable) {
    return Response.json(base);
  }
  return Response.json({ ...base, email: bowler.email, phone: bowler.phone, usbcId: bowler.usbc_id });
}

// Same enforcement here, independent of what the client's UI allowed
// someone to submit — editable is re-derived from the DB, never
// trusted from the request.
export async function PUT(req, { params }) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isMember(email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const bowlerId = Number(id);
  if (!Number.isInteger(bowlerId)) {
    return Response.json({ error: "Invalid bowler id" }, { status: 400 });
  }

  const { isAdminViewer, viewerBowlerId } = await getViewerContext(email);
  if (!isAdminViewer && viewerBowlerId !== bowlerId) {
    return Response.json({ error: "You can only edit your own card" }, { status: 403 });
  }

  const body = await req.json();
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const nickname = (body.nickname ?? "").trim() || null;
  const newEmail = (body.email ?? "").trim() || null;
  const phone = (body.phone ?? "").trim() || null;
  const usbcId = (body.usbcId ?? "").trim() || null;

  if (!firstName || !lastName) {
    return Response.json({ error: "First and last name are required" }, { status: 400 });
  }
  if (newEmail && !EMAIL_RE.test(newEmail)) {
    return Response.json({ error: "That doesn't look like a valid email" }, { status: 400 });
  }

  try {
    await sql`
      UPDATE bowlers
      SET first_name = ${firstName},
          last_name = ${lastName},
          nickname = ${nickname},
          email = ${newEmail},
          phone = ${phone},
          usbc_id = ${usbcId}
      WHERE id = ${bowlerId}
    `;
  } catch (err) {
    if (err.code === "23505") {
      return Response.json({ error: "That USBC ID is already in use by another bowler" }, { status: 400 });
    }
    console.error("bowler update failed:", err);
    return Response.json({ error: "Save failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
