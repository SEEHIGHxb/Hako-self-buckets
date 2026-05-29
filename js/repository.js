/**
 * Hako — repository.js
 * CRUD layer over HakoState. The single seam between UI and persisted data.
 *
 * Future LLM integration plugs in at `summarizeWeek(weekStart)` below.
 */

/* ---------- Buckets ---------- */

function listBuckets() {
  return [...HakoState.buckets].sort((a, b) => a.sortOrder - b.sortOrder);
}

function getBucketByKind(kind) {
  return HakoState.buckets.find(b => b.kind === kind) || null;
}

function getBucketById(id) {
  return HakoState.buckets.find(b => b.id === id) || null;
}

/* ---------- Items ---------- */

function listItems({ activeOnly = false } = {}) {
  return HakoState.items
    .filter(i => !activeOnly || i.isActive)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

function listItemsByKind(kind, { activeOnly = false } = {}) {
  const bucket = getBucketByKind(kind);
  if (!bucket) return [];
  return HakoState.items
    .filter(i => i.bucketId === bucket.id && (!activeOnly || i.isActive))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getItem(itemId) {
  return HakoState.items.find(i => i.id === itemId) || null;
}

function createItem({ bucketId, name, targetHoursPerWeek = null, targetTimesPerWeek = null, notes = '', isActive = true }) {
  const item = {
    id: generateId('it'),
    bucketId,
    name: name.trim(),
    targetHoursPerWeek,
    targetTimesPerWeek,
    notes: (notes || '').trim(),
    isActive: !!isActive,
  };
  HakoState.items.push(item);
  saveState();
  return item;
}

function updateItem(itemId, patch) {
  const item = getItem(itemId);
  if (!item) return null;
  if (patch.name !== undefined) item.name = patch.name.trim();
  if (patch.targetHoursPerWeek !== undefined) item.targetHoursPerWeek = patch.targetHoursPerWeek;
  if (patch.targetTimesPerWeek !== undefined) item.targetTimesPerWeek = patch.targetTimesPerWeek;
  if (patch.notes !== undefined) item.notes = (patch.notes || '').trim();
  if (patch.isActive !== undefined) item.isActive = !!patch.isActive;
  if (patch.bucketId !== undefined) item.bucketId = patch.bucketId;
  saveState();
  return item;
}

function deleteItem(itemId) {
  const idx = HakoState.items.findIndex(i => i.id === itemId);
  if (idx < 0) return false;
  HakoState.items.splice(idx, 1);
  // Cascade: drop daily logs tied to this item
  HakoState.dailyLogs = HakoState.dailyLogs.filter(l => l.itemId !== itemId);
  saveState();
  return true;
}

function isItemTimeTracked(item) {
  return item.targetHoursPerWeek !== null && item.targetHoursPerWeek !== undefined;
}

function isItemBinary(item) {
  return !isItemTimeTracked(item);
}

/* ---------- Daily logs ---------- */

function getLog(dateIso, itemId) {
  return HakoState.dailyLogs.find(l => l.date === dateIso && l.itemId === itemId) || null;
}

function upsertLog(dateIso, itemId, { hoursSpent = null, didIt = null, note = '' } = {}) {
  const existing = getLog(dateIso, itemId);
  if (existing) {
    if (hoursSpent !== null) existing.hoursSpent = hoursSpent;
    if (didIt !== null) existing.didIt = didIt;
    if (note !== '') existing.note = note;
  } else {
    HakoState.dailyLogs.push({
      id: generateId('lg'),
      date: dateIso,
      itemId,
      hoursSpent,
      didIt,
      note,
    });
  }
  saveState();
}

function setHoursLog(dateIso, itemId, hours, note = '') {
  const existing = getLog(dateIso, itemId);
  if (existing) {
    existing.hoursSpent = hours;
    if (note !== '') existing.note = note;
  } else {
    HakoState.dailyLogs.push({
      id: generateId('lg'),
      date: dateIso,
      itemId,
      hoursSpent: hours,
      didIt: null,
      note,
    });
  }
  saveState();
}

function setBinaryLog(dateIso, itemId, didIt, note = '') {
  const existing = getLog(dateIso, itemId);
  if (existing) {
    existing.didIt = didIt;
    if (note !== '') existing.note = note;
  } else {
    HakoState.dailyLogs.push({
      id: generateId('lg'),
      date: dateIso,
      itemId,
      hoursSpent: null,
      didIt,
      note,
    });
  }
  saveState();
}

function getLogsForDate(dateIso) {
  return HakoState.dailyLogs.filter(l => l.date === dateIso);
}

function getLogsInRange(startIso, endIso) {
  return HakoState.dailyLogs.filter(l => l.date >= startIso && l.date <= endIso);
}

/* ---------- Aggregations ---------- */

function weeklyHoursByItem(weekMondayIso) {
  const sunday = addDays(weekMondayIso, 6);
  const totals = {};
  for (const log of HakoState.dailyLogs) {
    if (log.date < weekMondayIso || log.date > sunday) continue;
    if (log.hoursSpent === null || log.hoursSpent === undefined) continue;
    totals[log.itemId] = (totals[log.itemId] || 0) + Number(log.hoursSpent);
  }
  return totals;
}

function weeklyDidCountsByItem(weekMondayIso) {
  const sunday = addDays(weekMondayIso, 6);
  const counts = {};
  for (const log of HakoState.dailyLogs) {
    if (log.date < weekMondayIso || log.date > sunday) continue;
    if (log.didIt) counts[log.itemId] = (counts[log.itemId] || 0) + 1;
  }
  return counts;
}

/* ---------- Reflections ---------- */

function getReflection(weekMondayIso) {
  return HakoState.reflections.find(r => r.weekStart === weekMondayIso) || null;
}

function saveReflection(weekMondayIso, content) {
  const existing = getReflection(weekMondayIso);
  if (existing) {
    existing.content = content;
  } else {
    HakoState.reflections.push({
      id: generateId('rf'),
      weekStart: weekMondayIso,
      content,
      aiSummary: null,
    });
  }
  saveState();
}

function listReflections() {
  return [...HakoState.reflections].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

/* ---------- Future LLM seam ---------- */

function summarizeWeek(/* weekMondayIso */) {
  // Reserved for future LLM integration. Returns null in v1.
  return null;
}
