// PATH: lib/canViewContactInfo.js
//
// Tiered contact-info (email/phone/USBC ID) visibility for a bowler's
// card, scoped to the season being viewed — name/team/average stay
// visible to any authenticated member regardless, this only gates the
// contact fields. One real authorization function, checked both when
// the API route builds its response (the actual boundary) and by the
// client to decide what to render — never the other way around.
//
// Editing is a separate, unchanged rule (self or admin only) — this
// function has no opinion on it.
//
// viewerMembership/targetMembership: { teamId, isCaptain } | null —
// null means that person has no league_membership row for this season
// at all (e.g. an admin who isn't also a bowler this season).

export function canViewContactInfo({ isAdmin, isOwnCard, viewerMembership, targetMembership }) {
  if (isOwnCard) return true;
  if (isAdmin) return true;

  // A substitute's contact info is hidden from everyone but admin/self,
  // regardless of the viewer's own tier.
  if (!targetMembership || targetMembership.teamId === null) return false;

  if (!viewerMembership) return false;

  // Teammate (same real team) — covers both regular members and
  // captains seeing their own team's contact info.
  if (viewerMembership.teamId !== null && viewerMembership.teamId === targetMembership.teamId) {
    return true;
  }

  // A captain additionally sees every other team's captain.
  if (viewerMembership.isCaptain && targetMembership.isCaptain) return true;

  return false;
}
