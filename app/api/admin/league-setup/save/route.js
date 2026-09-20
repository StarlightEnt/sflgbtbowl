import { requireAdminApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Create-or-update, distinguished by whether the body carries an id —
// same shape as the rest of this app's admin save routes (season-setup,
// tournaments). League Setup always allows editing an existing league
// (day/venue/bowl.com ID can change; the season-scoped data underneath
// it never does), unlike Season Setup's one-shot save.
export async function POST(req) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const body = await req.json();
  const id = body.id ? Number(body.id) : null;
  const name = (body.name ?? "").trim();
  const slug = (body.slug ?? "").trim().toLowerCase();
  const dayOfWeek = (body.dayOfWeek ?? "").trim();
  const venueId = body.venueId === "" || body.venueId == null ? null : Number(body.venueId);
  const bowlComLssId = body.bowlComLssId === "" || body.bowlComLssId == null
    ? null
    : Number(body.bowlComLssId);

  if (!name) {
    return Response.json({ error: "League name is required" }, { status: 400 });
  }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return Response.json(
      { error: "Slug must be lowercase letters, numbers, and hyphens only" },
      { status: 400 }
    );
  }
  if (dayOfWeek && !DAYS_OF_WEEK.includes(dayOfWeek)) {
    return Response.json({ error: "Invalid day of week" }, { status: 400 });
  }
  if (venueId !== null && !Number.isInteger(venueId)) {
    return Response.json({ error: "Invalid venue" }, { status: 400 });
  }
  if (bowlComLssId !== null && !Number.isInteger(bowlComLssId)) {
    return Response.json(
      { error: "Bowl.com League Standing Sheet # must be a whole number" },
      { status: 400 }
    );
  }

  try {
    if (id) {
      const rows = await sql`
        UPDATE leagues
        SET name = ${name},
            slug = ${slug},
            day_of_week = ${dayOfWeek || null},
            venue_id = ${venueId},
            bowl_com_lss_id = ${bowlComLssId}
        WHERE id = ${id}
        RETURNING id
      `;
      if (rows.length === 0) {
        return Response.json({ error: "League not found" }, { status: 404 });
      }
      return Response.json({ ok: true, id: rows[0].id });
    }

    const rows = await sql`
      INSERT INTO leagues (name, slug, day_of_week, venue_id, bowl_com_lss_id)
      VALUES (${name}, ${slug}, ${dayOfWeek || null}, ${venueId}, ${bowlComLssId})
      RETURNING id
    `;
    return Response.json({ ok: true, id: rows[0].id });
  } catch (err) {
    if (err.code === "23503") {
      return Response.json({ error: "That venue no longer exists" }, { status: 400 });
    }
    if (err.code === "23505") {
      return Response.json(
        { error: `Slug "${slug}" is already in use by another league` },
        { status: 400 }
      );
    }
    console.error("league-setup save failed:", err);
    return Response.json({ error: "Save failed" }, { status: 500 });
  }
}
