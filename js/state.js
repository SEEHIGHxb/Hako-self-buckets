/**
 * Hako — Self-Buckets
 * state.js — LocalStorage persistence and initial seed.
 */

const LOCAL_STORAGE_KEY = 'hako_self_buckets_state';
const SCHEMA_VERSION = 1;

// Bucket kinds map (sort order + UI labels)
const KIND_ORDER = ['anchor', 'soul', 'curiosity', 'floor', 'habit'];

const KIND_LABELS = {
  anchor:    { title: 'Bucket 1 — Money Maker',     chip: 'Anchor',    desc: 'Your bill-paying skill — gets 80% of focused energy.' },
  soul:      { title: 'Bucket 2 — Soul Stuff',      chip: 'Soul',      desc: 'Hobbies you do because they make you feel alive. Unmonetized.' },
  curiosity: { title: 'Bucket 3 — Curiosity Shelf', chip: 'Curiosity', desc: 'Interests waiting their turn. Not now, not never.' },
  floor:     { title: 'Floor — Non-negotiable',     chip: 'Floor',     desc: 'Health minimums. Structure, not motivation.' },
  habit:     { title: 'Habit — Automated',          chip: 'Habit',     desc: 'Disciplines that run on autopilot.' },
};

// Generic seed — bucket structure with empty items. User adds their own.
const SEED_BUCKETS = [
  { name: 'Bucket 1 — Money Maker',     kind: 'anchor',    sortOrder: 1 },
  { name: 'Bucket 2 — Soul Stuff',      kind: 'soul',      sortOrder: 2 },
  { name: 'Bucket 3 — Curiosity Shelf', kind: 'curiosity', sortOrder: 3 },
  { name: 'Floor — Non-negotiable',     kind: 'floor',     sortOrder: 4 },
  { name: 'Habit — Automated',          kind: 'habit',     sortOrder: 5 },
];

// Suggested starter items so the first run isn't an empty void.
// User can edit/delete freely on the Buckets page.
const SEED_ITEMS = [
  { kind: 'anchor',    name: 'Main career skill',     targetHoursPerWeek: 24, targetTimesPerWeek: null, notes: 'Your bill-paying skill. Already somewhat good at, real demand, you don\'t hate it.', isActive: true  },
  { kind: 'soul',      name: 'Hobby A',               targetHoursPerWeek: null, targetTimesPerWeek: null, notes: 'A hobby you do because it makes you feel alive.', isActive: true  },
  { kind: 'soul',      name: 'Hobby B',               targetHoursPerWeek: null, targetTimesPerWeek: null, notes: 'Another unmonetized activity.', isActive: true  },
  { kind: 'soul',      name: 'Creative side project', targetHoursPerWeek: 2,    targetTimesPerWeek: null, notes: 'Capped time slot, no monetization expectation.', isActive: true  },
  { kind: 'curiosity', name: 'Curiosity item A',      targetHoursPerWeek: null, targetTimesPerWeek: null, notes: 'Shelved for later. Not now, not never.', isActive: false },
  { kind: 'curiosity', name: 'Curiosity item B',      targetHoursPerWeek: null, targetTimesPerWeek: null, notes: 'Has a clear re-entry path when conditions change.', isActive: false },
  { kind: 'floor',     name: 'Exercise',              targetHoursPerWeek: null, targetTimesPerWeek: 3,    notes: '3 times per week minimum. Structure not motivation.', isActive: true  },
  { kind: 'habit',     name: 'Long-term investing',   targetHoursPerWeek: null, targetTimesPerWeek: null, notes: '~30 min/month. Auto-invest into low-cost index funds.', isActive: true  },
];

const DEFAULT_PREFERENCES = {
  theme: 'dark',
  weekStartsOnMonday: true,
  driftThresholdPct: 0.70,
  driftWeeksRequired: 2,
  lookbackWeeks: 8,
};

let HakoState = freshState();

function freshState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    buckets: [],
    items: [],
    dailyLogs: [],
    reflections: [],
    preferences: { ...DEFAULT_PREFERENCES },
    updatedAt: 0,
  };
}

function generateId(prefix = 'hk') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 7)}`;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadState() {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    seedFreshState();
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    HakoState = {
      ...freshState(),
      ...parsed,
      preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences || {}) },
    };
    // Defensive: ensure arrays exist
    for (const key of ['buckets', 'items', 'dailyLogs', 'reflections']) {
      if (!Array.isArray(HakoState[key])) HakoState[key] = [];
    }
    // If buckets are missing (corrupted state), reseed
    if (HakoState.buckets.length === 0) {
      seedFreshState();
    }
  } catch (err) {
    console.error('Failed to parse state, reseeding:', err);
    seedFreshState();
  }
}

function saveState() {
  HakoState.updatedAt = Date.now();
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(HakoState));
  } catch (err) {
    console.error('Failed to persist state:', err);
  }
}

function seedFreshState() {
  HakoState = freshState();
  const kindToBucketId = {};
  for (const b of SEED_BUCKETS) {
    const bucket = { id: generateId('bk'), ...b };
    HakoState.buckets.push(bucket);
    kindToBucketId[b.kind] = bucket.id;
  }
  for (const it of SEED_ITEMS) {
    HakoState.items.push({
      id: generateId('it'),
      bucketId: kindToBucketId[it.kind],
      name: it.name,
      targetHoursPerWeek: it.targetHoursPerWeek,
      targetTimesPerWeek: it.targetTimesPerWeek,
      notes: it.notes,
      isActive: it.isActive,
    });
  }
  saveState();
}

function resetAllData() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  seedFreshState();
}

function exportStateJSON() {
  return JSON.stringify(HakoState, null, 2);
}

function importStateJSON(jsonStr) {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON shape.');
  if (!Array.isArray(parsed.buckets)) throw new Error('Missing buckets array.');
  HakoState = {
    ...freshState(),
    ...parsed,
    preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences || {}) },
  };
  saveState();
}
