/**
 * Hako — time-math.js
 * Pure date helpers. Mirrors the Python self_buckets/time_math.py.
 *
 * Date convention: ISO date strings (YYYY-MM-DD) everywhere on the boundary.
 * Internal calculations construct Date objects in local time at midnight to
 * avoid timezone surprises.
 */

function todayISO() {
  return toISODate(new Date());
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(iso) {
  // Construct as local-midnight to avoid TZ shifts that occur with `new Date('YYYY-MM-DD')`.
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function dayOfWeekISO(iso) {
  // Monday = 0 ... Sunday = 6
  const d = parseISODate(iso);
  return (d.getDay() + 6) % 7;
}

function weekStart(iso) {
  const offset = dayOfWeekISO(iso);
  return addDays(iso, -offset);
}

function weekEnd(iso) {
  return addDays(weekStart(iso), 6);
}

function weekRange(iso) {
  const start = weekStart(iso);
  return [start, addDays(start, 6)];
}

function recentWeekStarts(todayIso, n) {
  if (n < 1) return [];
  const thisMonday = weekStart(todayIso);
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    result.push(addDays(thisMonday, -7 * i));
  }
  return result;
}

function consecutiveFloorStreak(weeklyCounts, target, mostRecentWeekIso) {
  let streak = 0;
  let cursor = mostRecentWeekIso;
  // Safety bound: don't walk back forever (max 520 = 10 years)
  for (let i = 0; i < 520; i++) {
    const count = weeklyCounts[cursor] || 0;
    if (count >= target) {
      streak += 1;
      cursor = addDays(cursor, -7);
    } else {
      break;
    }
  }
  return streak;
}

function isDrifting(weeklyHours, targetHours, mostRecentWeekIso, opts = {}) {
  const thresholdPct = opts.thresholdPct ?? 0.70;
  const weeksRequired = opts.weeksRequired ?? 2;
  if (targetHours <= 0 || weeksRequired < 1) return false;
  const threshold = targetHours * thresholdPct;
  let cursor = mostRecentWeekIso;
  for (let i = 0; i < weeksRequired; i++) {
    const actual = weeklyHours[cursor] || 0;
    if (actual >= threshold) return false;
    cursor = addDays(cursor, -7);
  }
  return true;
}

function humanDate(iso) {
  const d = parseISODate(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

function shortDate(iso) {
  const d = parseISODate(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function dayShort(iso) {
  const d = parseISODate(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}
