// PATH: lib/leagueSlug.js
//
// Single source of truth for the one league this admin area is
// scoped to (no league switcher exists) — previously duplicated as a
// literal in lib/currentSeason.js, lib/pdf/saveSeasonSetup.js,
// components/layout/Navigation.js, and components/Admin/AdminSidebar.js.
// If the league is ever re-slugged, saveSeasonSetup.js's upsert
// already anticipates a name change (ON CONFLICT (slug) DO UPDATE SET
// name) — a slug change needs updating this one constant, not four
// scattered literals that would otherwise silently drift out of sync.

export const LGBT_WEDNESDAY_LEAGUE_SLUG = "lgbt-wednesday-community";
