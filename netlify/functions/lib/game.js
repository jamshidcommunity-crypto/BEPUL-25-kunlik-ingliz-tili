// Shared scoring + badge rules (used by progress.js on the server; mirrored in src/app.js on the client).
const BADGES = [
  { id: 'first', icon: '🌱', name: 'Birinchi qadam', desc: 'Birinchi darsni tugatdingiz' },
  { id: 'perfect', icon: '💯', name: 'Mukammal', desc: 'Bitta darsda 18/18' },
  { id: 'shadow1', icon: '🎧', name: 'Birinchi shadowing', desc: 'Birinchi shadowingni tugatdingiz' },
  { id: 'streak3', icon: '🔥', name: '3 kun ketma-ket', desc: '3 kun uzluksiz shugʻullandingiz' },
  { id: 'streak7', icon: '⚡', name: '7 kun ketma-ket', desc: 'Bir hafta uzluksiz!' },
  { id: 'words50', icon: '📚', name: '50 soʻz', desc: '50 ta soʻzni takrorlashda toʻgʻri topdingiz' },
  { id: 'day5', icon: '🥉', name: '5 kun', desc: '1–5-kunlar tugallandi' },
  { id: 'day10', icon: '🥈', name: '10 kun', desc: '1–10-kunlar tugallandi' },
  { id: 'half', icon: '🏅', name: 'Yarim yoʻl', desc: '17 ta dars tugallandi' },
  { id: 'day20', icon: '🥇', name: '20 kun', desc: '1–20-kunlar tugallandi' },
  { id: 'shadow10', icon: '🎙️', name: 'Shadowing ustasi', desc: '10 kunlik shadowing' },
  { id: 'final', icon: '🎓', name: 'Bitiruvchi', desc: 'Yakuniy testdan oʻtdingiz' },
];
const PASS = 14;
function points(p) {
  let s = 0;
  for (const u of Object.values(p.units || {})) s += Math.round((u.score || 0) * 10);
  s += Object.keys(p.shadow || {}).length * 50;
  if (p.test) s += (p.test.score || 0) * 5;
  s += Math.min(p.srsCorrect || 0, 2000) * 2;
  return s;
}
module.exports = { BADGES, PASS, points };
