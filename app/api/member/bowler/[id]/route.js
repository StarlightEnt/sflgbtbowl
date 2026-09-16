import { auth } from "@/lib/auth";
import { isAdmin, isMember } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";
import { getCurrentSeason } from "@/lib/currentSeason";
import { canViewContactInfo } from "@/lib/canViewContactInfo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getViewerContext(email) {
  const admin = await isAdmin(email);
  const rows = await sql`SELECT id FROM bowlers WHERE email = ${email}`;
  return { isAdminViewer: admin, viewerBowlerId: rows[0]?.id ?? null };
}

// { teamId, isCaptain } for this bowler's league_membership in the
// given season, or null if they have none.
async function getMembership(bowlerId, seasonId) {
  if (!bowlerId || !seasonId) return null;
  const rows = await sql`
    SELECT team_id, is_captain FROM league_memberships
    WHERE bowler_id = ${bowlerId} AND season_id = ${seasonId}
  `;
  if (rows.length === 0) return null;
  return { teamId: rows[0].team_id, isCaptain: rows[0].is_captain };
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

// This route, not the modal's own rendering, is the real privacy
// boundary — email/phone/usbc_id are only ever included in the
// response when canViewContactInfo() says so (see lib/canViewContactInfo.js
// for the tiered rule), never present at all otherwise.
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
    SELECT id, first_name, last_name, nickname, nickname_use_in_display, email, phone, usbc_id
    FROM bowlers WHERE id = ${bowlerId}
  `;
  if (bowlerRows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const bowler = bowlerRows[0];

  const { isAdminViewer, viewerBowlerId } = await getViewerContext(email);
  const isOwnCard = viewerBowlerId === bowlerId;
  const editable = isAdminViewer || isOwnCard;
  const leagues = await loadLeagues(bowlerId);

  const season = await getCurrentSeason();
  const [viewerMembership, targetMembership] = await Promise.all([
    getMembership(viewerBowlerId, season?.id),
    getMembership(bowlerId, season?.id),
  ]);
  const canViewContact = canViewContactInfo({
    isAdmin: isAdminViewer,
    isOwnCard,
    viewerMembership,
    targetMembership,
  });

  const base = {
    id: bowler.id,
    firstName: bowler.first_name,
    lastName: bowler.last_name,
    nickname: bowler.nickname,
    nicknameUseInDisplay: bowler.nickname_use_in_display,
    editable,
    canViewContact,
    leagues,
  };

  if (!canViewContact) {
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
  // Ignored (not persisted) unless a nickname is actually on file —
  // matches bowlerDisplayName()'s own fallback in lib/displayName.js,
  // so the stored flag never claims a display behavior that isn't real.
  const nicknameUseInDisplay = Boolean(body.nicknameUseInDisplay) && Boolean(nickname);
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
          nickname_use_in_display = ${nicknameUseInDisplay},
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
