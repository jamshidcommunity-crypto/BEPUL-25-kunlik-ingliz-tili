// Course calendar. One source of truth: b25_config.main.startDate = 'YYYY-MM-DD' (Tashkent).
// Day N of the course is startDate + (N-1) days. Before startDate the calendar day is 0 (nothing open).
const TOTAL = 25;
const TZ = 5 * 3600e3; // Asia/Tashkent, no DST

function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]); // 00:00 UTC of that civil date
  return new Date(t).toISOString().slice(0, 10) === m[0] ? t : null; // rejects 2026-13-45
}
// Tashkent civil date of nowMs as 'YYYY-MM-DD'
function todayStr(nowMs = Date.now()) { return new Date(nowMs + TZ).toISOString().slice(0, 10); }
// YYYY-MM-DD shifted by n days
function addDays(s, n) { const t = parseDate(s); return new Date(t + n * 864e5).toISOString().slice(0, 10); }

// Calendar day (0..25) for the config. Falls back to the legacy manual openDay when no startDate is set.
function calendarDay(cfg = {}, nowMs = Date.now()) {
  const start = parseDate(cfg.startDate);
  if (start == null) return Math.max(0, Math.min(TOTAL, cfg.openDay || 1));
  const today = parseDate(todayStr(nowMs));
  const d = Math.round((today - start) / 864e5) + 1;
  return Math.max(0, Math.min(TOTAL, d));
}
// startDate such that today is day n
function startDateForDay(n, nowMs = Date.now()) { return addDays(todayStr(nowMs), -(n - 1)); }

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
function fmt(s) { const t = parseDate(s); if (t == null) return ''; const d = new Date(t); return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}`; }

module.exports = { TOTAL, parseDate, todayStr, addDays, calendarDay, startDateForDay, fmt };
