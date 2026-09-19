import { auth } from "@/lib/auth";
import { isAdmin, isMember, isOfficer } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";
import { getCurrentSeason } from "@/lib/currentSeason";
import { canViewContactInfo } from "@/lib/canViewContactInfo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One source of truth for the viewer's role, used by both GET and PUT
// so neither has to call isOfficer/isAdmin a second time.
async function getViewerContext(email) {
  const [admin, officer] = await Promise.all([isAdmin(email), isOfficer(email)]);
  const rows = await sql`SELECT id FROM bowlers WHERE email = ${email}`;
  return { isAdminViewer: admin, isOfficerViewer: officer, viewerBowlerId: rows[0]?.id ?? null };
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

// currentSeasonId flags which row (if any) is this bowler's membership
// in the league/season the modal was opened from — that's the only row
// the Team Captain checkbox is ever editable for, since is_captain
// lives per league_membership (one per season), not per bowler.
async function loadLeagues(bowlerId, currentSeasonId) {
  const rows = await sql`
    SELECT s.id AS season_id, l.name AS league_name, lm.team_id, t.team_name, lm.real_average, lm.is_captain
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
    isCurrentSeason: currentSeasonId != null && r.season_id === currentSeasonId,
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

  const { searchParams } = new URL(req.url);
  const leagueSlug = searchParams.get("leagueSlug");
  if (!leagueSlug) {
    return Response.json({ error: "Missing leagueSlug" }, { status: 400 });
  }

  const bowlerRows = await sql`
    SELECT id, first_name, last_name, nickname, nickname_use_in_display, email, phone, usbc_id
    FROM bowlers WHERE id = ${bowlerId}
  `;
  if (bowlerRows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const bowler = bowlerRows[0];

  const { isAdminViewer, isOfficerViewer, viewerBowlerId } = await getViewerContext(email);
  const isOwnCard = viewerBowlerId === bowlerId;
  const editable = isAdminViewer || isOfficerViewer || isOwnCard;

  // The viewer's contact-visibility tiering is scoped to whichever
  // league's roster page this request came from — a shared team in
  // LWC doesn't grant contact visibility while looking at GG's roster,
  // and vice versa. Fetched before loadLeagues so it can flag which of
  // this bowler's league rows is the one the captain checkbox applies to.
  const season = await getCurrentSeason(leagueSlug);
  const [viewerMembership, targetMembership, leagues] = await Promise.all([
    getMembership(viewerBowlerId, season?.id),
    getMembership(bowlerId, season?.id),
    loadLeagues(bowlerId, season?.id ?? null),
  ]);
  const canViewContact = canViewContactInfo({
    isAdmin: isAdminViewer,
    isOfficer: isOfficerViewer,
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
    // Team Captain is admin-only — narrower than `editable`, which also
    // covers officers and self-editing identity fields (see the modal's
    // own copy: "Only admins can change the captain flag").
    canEditCaptain: isAdminViewer,
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

  const { isAdminViewer, isOfficerViewer, viewerBowlerId } = await getViewerContext(email);
  if (!isAdminViewer && !isOfficerViewer && viewerBowlerId !== bowlerId) {
    return Response.json({ error: "You can only edit your own card" }, { status: 403 });
  }

  const body = await req.json();

  // Team Captain is saved as its own request, separate from the
  // identity-field form below — it's per league/season
  // (league_memberships.is_captain), not per bowler, sent with no
  // firstName/lastName at all, and — per the roster modal's own copy —
  // admin-only, never officer- or self-editable. Detected by the
  // presence of `isCaptain` in the body and handled as a complete,
  // separate branch so it's never blocked by the identity fields'
  // "First and last name are required" check below. The season is
  // resolved server-side from leagueSlug, never trusted from the client.
  if (typeof body.isCaptain === "boolean") {
    if (!isAdminViewer) {
      return Response.json({ error: "Only admins can change the captain flag" }, { status: 403 });
    }
    if (typeof body.leagueSlug !== "string" || !body.leagueSlug) {
      return Response.json({ error: "Missing leagueSlug" }, { status: 400 });
    }
    const captainSeason = await getCurrentSeason(body.leagueSlug);
    if (!captainSeason) {
      return Response.json({ error: "No current season for that league" }, { status: 400 });
    }
    const capRows = await sql`
      UPDATE league_memberships
      SET is_captain = ${body.isCaptain}
      WHERE bowler_id = ${bowlerId} AND season_id = ${captainSeason.id}
      RETURNING bowler_id
    `;
    if (capRows.length === 0) {
      return Response.json(
        { error: "This bowler has no roster spot in the current season for that league" },
        { status: 400 }
      );
    }
    return Response.json({ ok: true });
  }

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
      if (err.constraint === "idx_bowlers_email_unique") {
        return Response.json({ error: "That email is already in use by another bowler" }, { status: 400 });
      }
      return Response.json({ error: "That USBC ID is already in use by another bowler" }, { status: 400 });
    }
    console.error("bowler update failed:", err);
    return Response.json({ error: "Save failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
