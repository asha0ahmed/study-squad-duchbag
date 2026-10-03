// Single source of truth for how many members a squad holds.
// Every "is the squad full?" / "does the squad have room?" check in
// server.js reads this -- change it here (and SQUAD_SIZE in
// frontend/lib/squadConfig.ts) and nothing else needs to be hunted down.
//
// Only the CAPACITY lives here. These stay as they were and are
// intentionally separate: the auto-match seed size (4, utils/matching.js),
// the lock/activation threshold (4, activateSquadIfReady) and the
// 2-use invite-link cap (squads.invite_uses CHECK in the schema).
const SQUAD_SIZE = 10;

module.exports = { SQUAD_SIZE };
