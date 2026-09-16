// PATH: lib/displayName.js
//
// The one place that decides how a bowler's full name reads wherever
// the site shows it as a single combined name (Member Roster, the
// bowler card) — as opposed to the separate First/Last/Nickname
// fields shown in the edit form itself, which always show the real
// underlying values regardless of this setting.
//
// A bowler can opt in to displaying as "Nickname Lastname" instead of
// "Firstname Lastname" via nickname_use_in_display — e.g. John
// Francis Unson, nickname "JF", checked -> "JF Unson". Off by
// default, and silently falls back to first name if the flag is set
// but no nickname is on file.

export function bowlerDisplayName({ firstName, lastName, nickname, nicknameUseInDisplay }) {
  const first = nicknameUseInDisplay && nickname ? nickname : firstName;
  return `${first} ${lastName}`.trim();
}
