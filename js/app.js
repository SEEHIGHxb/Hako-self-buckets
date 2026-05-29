/**
 * Hako — app.js
 * UI controller: tab navigation, page renderers, modal handlers, theme.
 */

let activeTab = 'home';
let dailySelectedDate = todayISO();
let reflectionSelectedWeek = weekStart(todayISO());

const REFLECTION_PROMPTS = [
  'What worked this week?',
  'Where did I drift from my buckets?',
  'What pulled at me from Bucket 3?',
  'What does next week need from me?',
];

/* ====================== DOM HELPERS ====================== */

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function fmtHours(h) {
  if (h == null) return '—';
  return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
}

function clearChildren(node) { while (node.firstChild) node.removeChild(node.firstChild); }

/* ====================== TAB NAVIGATION ====================== */

const PAGE_TITLES = {
  home: 'Home',
  buckets: 'Buckets',
  daily: 'Daily Check-in',
  dashboard: 'Dashboard',
  reflection: 'Reflection',
  settings: 'Settings',
};

function showTab(name) {
  activeTab = name;
  $$('.tab-content').forEach(s => s.classList.remove('active'));
  $(`#tab-${name}`)?.classList.add('active');
  $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.tab === name));
  const title = PAGE_TITLES[name] || name;
  $('#pageTitle').textContent = title;
  // Re-render the relevant tab
  switch (name) {
    case 'home':       renderHome(); break;
    case 'buckets':    renderBuckets(); break;
    case 'daily':      renderDaily(); break;
    case 'dashboard':  renderDashboard(); break;
    case 'reflection': renderReflection(); break;
  }
  // Close mobile sidebar on tab click
  $('#sidebar').classList.remove('open');
  $('#sidebarOverlay').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNavigation() {
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showTab(link.dataset.tab);
    });
  });

  $('#mobileMenuToggle')?.addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
    $('#sidebarOverlay').classList.toggle('open');
  });
  $('#sidebarOverlay')?.addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    $('#sidebarOverlay').classList.remove('open');
  });
}

/* ====================== THEME ====================== */

function applyTheme() {
  const theme = HakoState.preferences.theme || 'light';
  document.body.classList.toggle('theme-dark', theme === 'dark');
  $('#themeToggleText').textContent = theme === 'dark' ? 'Paper Mode' : 'Sumi Mode';
  // Sun for "go to light/paper", moon for "go to dark/sumi"
  $('#themeToggleIcon').innerHTML = theme === 'dark'
    ? `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
    : `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
}

function toggleTheme() {
  HakoState.preferences.theme = HakoState.preferences.theme === 'dark' ? 'light' : 'dark';
  saveState();
  applyTheme();
  // Re-render dashboard charts if visible
  if (activeTab === 'dashboard') renderDashboard();
}

/* ====================== RENDER: HOME ====================== */

function renderHome() {
  const today = todayISO();
  const monday = weekStart(today);

  const anchorItems = listItemsByKind('anchor', { activeOnly: true });
  const soulItems   = listItemsByKind('soul',   { activeOnly: true });
  const floorItems  = listItemsByKind('floor',  { activeOnly: true });

  const weekHours  = weeklyHoursByItem(monday);
  const weekCounts = weeklyDidCountsByItem(monday);

  const metricsRoot = $('#homeMetrics');
  clearChildren(metricsRoot);

  // Anchor metric card
  if (anchorItems.length) {
    const anchor = anchorItems[0];
    const actual = weekHours[anchor.id] || 0;
    const target = anchor.targetHoursPerWeek || 0;
    metricsRoot.appendChild(buildMetricCard({
      kind: 'anchor',
      label: 'Bucket 1',
      title: anchor.name,
      actual, target, unit: 'h',
    }));
  }

  // Video Game / time-tracked soul card
  const tgtSoul = soulItems.find(isItemTimeTracked);
  if (tgtSoul) {
    const actual = weekHours[tgtSoul.id] || 0;
    const target = tgtSoul.targetHoursPerWeek || 0;
    metricsRoot.appendChild(buildMetricCard({
      kind: 'soul',
      label: 'Bucket 2',
      title: tgtSoul.name,
      actual, target, unit: 'h',
    }));
  }

  // Exercise floor card
  const exercise = floorItems.find(i => i.targetTimesPerWeek);
  if (exercise) {
    const count = weekCounts[exercise.id] || 0;
    const target = exercise.targetTimesPerWeek || 0;
    metricsRoot.appendChild(buildFloorCard({
      title: exercise.name,
      count, target,
    }));
  }

  // Soul stuff today
  const todaysLogs = {};
  for (const l of getLogsForDate(today)) todaysLogs[l.itemId] = l;
  const binarySoul = soulItems.filter(isItemBinary);

  const soulGrid = $('#homeSoulGrid');
  clearChildren(soulGrid);
  for (const item of binarySoul) {
    const done = !!(todaysLogs[item.id] && todaysLogs[item.id].didIt);
    const tile = el('label', { class: 'checkbox-tile' + (done ? ' checked' : '') }, [
      el('input', {
        type: 'checkbox',
        checked: done || false,
        onchange: (e) => {
          setBinaryLog(today, item.id, e.target.checked);
          renderHome();
        },
      }),
      el('span', { text: item.name }),
    ]);
    soulGrid.appendChild(tile);
  }
  if (!binarySoul.length) {
    soulGrid.appendChild(el('p', { class: 'section-sub', text: 'No active soul items. Add some on the Buckets page.' }));
  }

  // Last reflection
  const reflectionRoot = $('#homeLastReflection');
  clearChildren(reflectionRoot);
  const reflections = listReflections();
  if (reflections.length) {
    const latest = reflections[0];
    const ageDays = Math.floor((parseISODate(today) - parseISODate(latest.weekStart)) / 86400000);
    const preview = (latest.content || '').split('\n').find(l => l.trim() && !l.startsWith('#')) || '(empty)';
    reflectionRoot.appendChild(el('div', { class: 'card' }, [
      el('div', { style: { fontWeight: '600', marginBottom: '6px' }, text: `Week of ${humanDate(latest.weekStart)} — ${ageDays} days ago` }),
      el('div', { class: 'section-sub', text: preview.slice(0, 200) }),
    ]));
  } else {
    reflectionRoot.appendChild(el('p', { class: 'section-sub', text: 'No reflections yet. Open the Reflection page on Sunday to write your first.' }));
  }
}

function buildMetricCard({ kind, label, title, actual, target, unit = 'h' }) {
  const pct = target > 0 ? Math.min(1, actual / target) : 0;
  const isLow = pct < 0.4;
  return el('div', { class: `metric-card kind-${kind}` }, [
    el('div', { class: 'metric-header' }, [
      el('span', { text: `${label} · ${title}` }),
    ]),
    el('div', { class: 'metric-value' }, [
      document.createTextNode(actual.toFixed(actual === Math.floor(actual) ? 0 : 1)),
      el('span', { class: 'unit', text: ` ${unit}` }),
    ]),
    el('div', { class: 'metric-target', text: `target ${fmtHours(target)} this week` }),
    el('div', { class: 'progress-bar' }, [
      el('div', {
        class: 'progress-fill' + (isLow ? ' low' : ''),
        style: { width: `${pct * 100}%` },
      }),
    ]),
  ]);
}

function buildFloorCard({ title, count, target }) {
  const dots = [];
  for (let i = 0; i < target; i++) {
    dots.push(el('span', { class: 'dot' + (i < count ? ' filled' : '') }));
  }
  return el('div', { class: 'metric-card kind-floor' }, [
    el('div', { class: 'metric-header' }, [
      el('span', { text: `Floor · ${title}` }),
    ]),
    el('div', { class: 'metric-value' }, [
      document.createTextNode(`${count}`),
      el('span', { class: 'unit', text: ` / ${target}` }),
    ]),
    el('div', { class: 'metric-target', text: 'Non-negotiable. Structure over motivation.' }),
    el('div', { class: 'dots-row' }, dots),
  ]);
}

/* ====================== RENDER: BUCKETS ====================== */

function renderBuckets() {
  const root = $('#bucketsContainer');
  clearChildren(root);

  for (const kind of KIND_ORDER) {
    const bucket = getBucketByKind(kind);
    if (!bucket) continue;
    const items = listItemsByKind(kind);

    const section = el('div', { class: 'bucket-section', 'data-kind': kind }, [
      el('div', { class: 'bucket-section-header' }, [
        el('div', { class: 'bucket-section-title' }, [
          el('span', { class: `bucket-kind-chip kind-${kind}`, text: KIND_LABELS[kind].chip }),
          el('h3', { text: KIND_LABELS[kind].title.replace(/^(Bucket \d+ — |Floor — |Habit — )/, '') }),
        ]),
        el('button', {
          class: 'btn-secondary btn',
          onclick: () => openItemModal({ mode: 'create', kind }),
          html: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>&nbsp; Add item`,
        }),
      ]),
      el('p', { class: 'bucket-section-desc', text: KIND_LABELS[kind].desc }),
    ]);

    if (!items.length) {
      section.appendChild(el('p', { class: 'section-sub', text: 'No items yet. Add one above.' }));
    } else {
      for (const item of items) {
        section.appendChild(buildItemRow(item));
      }
    }
    root.appendChild(section);
  }
}

function buildItemRow(item) {
  const target = (item.targetHoursPerWeek != null) ? `${item.targetHoursPerWeek}h / wk`
              : (item.targetTimesPerWeek != null) ? `${item.targetTimesPerWeek}× / wk`
              : '—';
  return el('div', { class: 'item-row' + (item.isActive ? '' : ' inactive') }, [
    el('div', {}, [
      el('div', { class: 'item-name', text: item.name }),
      item.notes ? el('div', { class: 'item-notes', text: item.notes }) : null,
    ]),
    el('div', { class: 'item-target', text: target }),
    el('div', { class: 'item-target', text: item.isActive ? 'Active' : 'Inactive' }),
    el('button', {
      class: 'icon-btn',
      title: 'Edit',
      onclick: () => openItemModal({ mode: 'edit', itemId: item.id }),
      html: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"></path></svg>`,
    }),
  ]);
}

/* ====================== MODAL: ITEM ====================== */

function openItemModal({ mode, kind, itemId }) {
  const modal = $('#itemModal');
  const title = $('#itemModalTitle');
  const idField = $('#itemFormId');
  const kindField = $('#itemFormKind');
  const nameField = $('#itemFormName');
  const hoursField = $('#itemFormHours');
  const timesField = $('#itemFormTimes');
  const notesField = $('#itemFormNotes');
  const activeField = $('#itemFormActive');
  const deleteBtn = $('#itemFormDeleteBtn');

  if (mode === 'create') {
    title.textContent = `Add to ${KIND_LABELS[kind].chip}`;
    idField.value = '';
    kindField.value = kind;
    nameField.value = '';
    hoursField.value = '';
    timesField.value = '';
    notesField.value = '';
    activeField.checked = true;
    deleteBtn.style.display = 'none';
  } else {
    const item = getItem(itemId);
    const bucket = getBucketById(item.bucketId);
    title.textContent = `Edit · ${KIND_LABELS[bucket.kind].chip}`;
    idField.value = item.id;
    kindField.value = bucket.kind;
    nameField.value = item.name;
    hoursField.value = item.targetHoursPerWeek ?? '';
    timesField.value = item.targetTimesPerWeek ?? '';
    notesField.value = item.notes;
    activeField.checked = item.isActive;
    deleteBtn.style.display = 'inline-flex';
  }
  modal.classList.add('open');
}

function closeItemModal() {
  $('#itemModal').classList.remove('open');
}

function setupItemForm() {
  $('#itemForm').addEventListener('submit', e => {
    e.preventDefault();
    const id = $('#itemFormId').value;
    const kind = $('#itemFormKind').value;
    const name = $('#itemFormName').value.trim();
    const hoursRaw = $('#itemFormHours').value;
    const timesRaw = $('#itemFormTimes').value;
    const notes = $('#itemFormNotes').value;
    const isActive = $('#itemFormActive').checked;

    if (!name) return;

    const targetHoursPerWeek = hoursRaw === '' ? null : Number(hoursRaw);
    const targetTimesPerWeek = timesRaw === '' ? null : Number(timesRaw);

    if (id) {
      updateItem(id, { name, targetHoursPerWeek, targetTimesPerWeek, notes, isActive });
    } else {
      const bucket = getBucketByKind(kind);
      createItem({ bucketId: bucket.id, name, targetHoursPerWeek, targetTimesPerWeek, notes, isActive });
    }
    closeItemModal();
    renderBuckets();
    if (activeTab === 'home') renderHome();
    if (activeTab === 'daily') renderDaily();
  });

  $('#itemFormDeleteBtn').addEventListener('click', () => {
    const id = $('#itemFormId').value;
    if (!id) return;
    if (!confirm('Delete this item? Its daily logs will also be removed.')) return;
    deleteItem(id);
    closeItemModal();
    renderBuckets();
    if (activeTab === 'home') renderHome();
    if (activeTab === 'daily') renderDaily();
  });

  $$('[data-close-modal]').forEach(b => b.addEventListener('click', closeItemModal));
  $('#itemModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeItemModal();
  });
}

/* ====================== RENDER: DAILY CHECK ====================== */

function renderDaily() {
  $('#dailyDate').value = dailySelectedDate;
  $('#dailyDateLong').textContent = humanDate(dailySelectedDate);

  const hoursRoot = $('#dailyHoursContainer');
  const binaryRoot = $('#dailyBinaryContainer');
  clearChildren(hoursRoot);
  clearChildren(binaryRoot);

  const dailyKinds = ['anchor', 'soul', 'floor'];
  const activeItems = dailyKinds.flatMap(k => listItemsByKind(k, { activeOnly: true }));

  const existing = {};
  for (const l of getLogsForDate(dailySelectedDate)) existing[l.itemId] = l;

  const timeTracked = activeItems.filter(isItemTimeTracked);
  const binary = activeItems.filter(isItemBinary);

  if (timeTracked.length) {
    const card = el('div', { class: 'card' }, [
      el('h3', { style: { fontSize: '16px', marginBottom: '14px' }, text: 'Hours' }),
    ]);
    for (const item of timeTracked) {
      const prev = existing[item.id];
      const targetHint = item.targetHoursPerWeek != null ? `target ${item.targetHoursPerWeek}h/wk` : '';
      const group = el('div', { class: 'input-group' }, [
        el('label', { for: `hrs_${item.id}`, text: `${item.name}${targetHint ? '  ·  ' + targetHint : ''}` }),
        el('input', {
          type: 'number', step: '0.5', min: '0', max: '24',
          id: `hrs_${item.id}`, class: 'form-control',
          value: (prev && prev.hoursSpent != null) ? String(prev.hoursSpent) : '0',
        }),
      ]);
      card.appendChild(group);
    }
    hoursRoot.appendChild(card);
  }

  if (binary.length) {
    const card = el('div', { class: 'card', style: { marginTop: '20px' } }, [
      el('h3', { style: { fontSize: '16px', marginBottom: '14px' }, text: 'Did you do it?' }),
      el('div', { class: 'checkbox-grid', id: 'dailyBinaryGrid' }),
    ]);
    binaryRoot.appendChild(card);
    const grid = card.querySelector('#dailyBinaryGrid');
    for (const item of binary) {
      const prev = existing[item.id];
      const checked = !!(prev && prev.didIt);
      grid.appendChild(el('label', { class: 'checkbox-tile' + (checked ? ' checked' : '') }, [
        el('input', { type: 'checkbox', id: `bin_${item.id}`, checked: checked || false }),
        el('span', { text: item.name }),
      ]));
    }
  }

  // Note field
  const anyNote = Object.values(existing).find(l => l.note);
  $('#dailyNote').value = anyNote ? anyNote.note : '';

  // Recent table
  renderRecentTable();
}

function renderRecentTable() {
  const wrap = $('#recentTableWrap');
  clearChildren(wrap);

  const dailyKinds = ['anchor', 'soul', 'floor'];
  const activeItems = dailyKinds.flatMap(k => listItemsByKind(k, { activeOnly: true }));
  if (!activeItems.length) {
    wrap.appendChild(el('p', { class: 'section-sub', text: 'No active items.' }));
    return;
  }

  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(dailySelectedDate, -i));

  const table = el('table', { class: 'recent-table' });
  const thead = el('thead');
  const headRow = el('tr', {}, [
    el('th', { text: 'Item' }),
    ...days.map(d => el('th', { text: `${dayShort(d)} ${shortDate(d).split(' ')[0]}` })),
  ]);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const item of activeItems) {
    const tr = el('tr', {}, [el('td', { class: 'label', text: item.name })]);
    for (const d of days) {
      const log = HakoState.dailyLogs.find(l => l.itemId === item.id && l.date === d);
      let txt = '';
      let cls = '';
      if (log) {
        if (log.hoursSpent != null) { txt = `${log.hoursSpent}h`; cls = 'filled'; }
        else if (log.didIt != null) { txt = log.didIt ? '●' : '·'; cls = log.didIt ? 'dot-cell' : ''; }
      }
      tr.appendChild(el('td', { class: cls, text: txt }));
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
}

function setupDailyForm() {
  $('#dailyDate').addEventListener('change', (e) => {
    dailySelectedDate = e.target.value;
    renderDaily();
  });

  $('#dailySaveBtn').addEventListener('click', () => {
    const dailyKinds = ['anchor', 'soul', 'floor'];
    const activeItems = dailyKinds.flatMap(k => listItemsByKind(k, { activeOnly: true }));
    const note = $('#dailyNote').value;

    for (const item of activeItems) {
      if (isItemTimeTracked(item)) {
        const input = $(`#hrs_${item.id}`);
        if (input) {
          setHoursLog(dailySelectedDate, item.id, Number(input.value) || 0, note);
        }
      } else {
        const input = $(`#bin_${item.id}`);
        if (input) {
          setBinaryLog(dailySelectedDate, item.id, input.checked, note);
        }
      }
    }
    $('#dailySaveStatus').textContent = `Saved ${humanDate(dailySelectedDate)}.`;
    setTimeout(() => $('#dailySaveStatus').textContent = '', 3000);
    renderDaily();
  });
}

/* ====================== RENDER: DASHBOARD ====================== */

function renderDashboard() {
  const today = todayISO();
  const monday = weekStart(today);
  $('#dashboardWeekBadge').textContent = `Week of ${humanDate(monday)}`;

  const lookback = HakoState.preferences.lookbackWeeks || 8;
  $('#lookbackLabel').textContent = lookback;

  const anchorItems = listItemsByKind('anchor', { activeOnly: true });
  const soulItems   = listItemsByKind('soul',   { activeOnly: true });
  const floorItems  = listItemsByKind('floor',  { activeOnly: true });

  const weekHours  = weeklyHoursByItem(monday);
  const weekCounts = weeklyDidCountsByItem(monday);

  // ----- This week metric cards
  const root = $('#dashboardMetrics');
  clearChildren(root);

  if (anchorItems.length) {
    const a = anchorItems[0];
    root.appendChild(buildMetricCard({
      kind: 'anchor', label: 'Bucket 1', title: a.name,
      actual: weekHours[a.id] || 0, target: a.targetHoursPerWeek || 0, unit: 'h',
    }));
  }
  const tgtSoul = soulItems.find(isItemTimeTracked);
  if (tgtSoul) {
    root.appendChild(buildMetricCard({
      kind: 'soul', label: 'Bucket 2', title: tgtSoul.name,
      actual: weekHours[tgtSoul.id] || 0, target: tgtSoul.targetHoursPerWeek || 0, unit: 'h',
    }));
  }
  const ex = floorItems.find(i => i.targetTimesPerWeek);
  if (ex) {
    root.appendChild(buildFloorCard({
      title: ex.name, count: weekCounts[ex.id] || 0, target: ex.targetTimesPerWeek || 0,
    }));
  }

  // ----- Soul tally
  renderSoulTally('soulTallyCanvas', monday);

  // ----- Trend (last N weeks, hours stacked by item)
  const weeks = recentWeekStarts(today, lookback);
  const trackedItems = [...anchorItems, ...soulItems].filter(isItemTimeTracked);
  const weeklyHoursByWeek = {};
  for (const w of weeks) weeklyHoursByWeek[w] = weeklyHoursByItem(w);
  renderTrend('trendCanvas', weeks, trackedItems, weeklyHoursByWeek);

  // ----- Exercise line
  if (ex) {
    const weeklyCounts = {};
    for (const w of weeks) {
      const counts = weeklyDidCountsByItem(w);
      weeklyCounts[w] = counts[ex.id] || 0;
    }
    renderExerciseLine('exerciseCanvas', weeks, weeklyCounts, ex.targetTimesPerWeek || 3);
  }

  // ----- Drift banner
  const banner = $('#driftBannerContainer');
  clearChildren(banner);
  if (anchorItems.length) {
    const a = anchorItems[0];
    const target = a.targetHoursPerWeek || 0;
    const weeklyHours = {};
    for (const w of weeks) weeklyHours[w] = (weeklyHoursByWeek[w] || {})[a.id] || 0;
    const drifting = isDrifting(weeklyHours, target, monday, {
      thresholdPct: HakoState.preferences.driftThresholdPct,
      weeksRequired: HakoState.preferences.driftWeeksRequired,
    });
    if (drifting) {
      banner.appendChild(el('div', { class: 'drift-banner warn' }, [
        el('span', { class: 'label', text: 'Drift flagged.' }),
        el('span', { class: 'desc', text: `${a.name} has been below 70% of the ${target}h target for 2 weeks running. Worth pausing to ask what's pulling at you.` }),
      ]));
    } else {
      banner.appendChild(el('div', { class: 'drift-banner ok' }, [
        el('span', { class: 'label', text: 'On track.' }),
        el('span', { class: 'desc', text: `${a.name}: ${(weekHours[a.id] || 0).toFixed(1)}h / ${target}h this week.` }),
      ]));
    }
  }
}

/* ====================== RENDER: REFLECTION ====================== */

function buildReflectionContent(answers) {
  return REFLECTION_PROMPTS.map((p, i) => `### ${p}\n\n${(answers[i] || '').trim()}\n`).join('\n').trim() + '\n';
}

function parseReflectionContent(content) {
  if (!content || !content.trim()) return REFLECTION_PROMPTS.map(() => '');
  const sections = {};
  const blocks = content.split(/^###\s+/m);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const newlineIdx = trimmed.indexOf('\n');
    if (newlineIdx === -1) continue;
    const header = trimmed.substring(0, newlineIdx).trim();
    const body = trimmed.substring(newlineIdx + 1).trim();
    sections[header] = body;
  }
  return REFLECTION_PROMPTS.map(p => sections[p] || '');
}

function renderReflection() {
  $('#reflectionWeekInput').value = reflectionSelectedWeek;
  const sunday = addDays(reflectionSelectedWeek, 6);
  $('#reflectionWeekLabel').textContent = `Week: ${humanDate(reflectionSelectedWeek)} — ${humanDate(sunday)}`;

  const existing = getReflection(reflectionSelectedWeek);
  const answers = existing ? parseReflectionContent(existing.content) : REFLECTION_PROMPTS.map(() => '');

  const root = $('#reflectionPromptsContainer');
  clearChildren(root);

  REFLECTION_PROMPTS.forEach((prompt, idx) => {
    root.appendChild(el('div', { class: 'reflection-prompt-card' }, [
      el('div', { class: 'prompt', text: prompt }),
      el('textarea', {
        class: 'form-control',
        id: `reflection_${idx}`,
        style: { minHeight: '90px' },
        text: answers[idx] || '',
      }),
    ]));
  });

  // Past reflections
  const pastRoot = $('#pastReflectionsContainer');
  clearChildren(pastRoot);
  const past = listReflections().filter(r => r.weekStart !== reflectionSelectedWeek);
  if (!past.length) {
    pastRoot.appendChild(el('p', { class: 'section-sub', text: 'No prior reflections.' }));
  } else {
    for (const r of past) {
      const today = todayISO();
      const weeksAgo = Math.floor((parseISODate(today) - parseISODate(r.weekStart)) / (86400000 * 7));
      pastRoot.appendChild(el('details', { class: 'past-reflection' }, [
        el('summary', {}, [
          el('span', { text: `Week of ${humanDate(r.weekStart)}  ·  ${weeksAgo} week(s) ago` }),
        ]),
        el('div', { class: 'past-reflection-body', html: markdownToHtml(r.content) }),
      ]));
    }
  }
}

function markdownToHtml(md) {
  if (!md) return '<em>(empty)</em>';
  const lines = md.split('\n');
  const out = [];
  let inPara = false;
  const flushPara = (buf) => { if (buf.length) out.push('<p>' + escapeHtml(buf.join(' ')) + '</p>'); };
  let paraBuf = [];
  for (const line of lines) {
    if (line.startsWith('### ')) {
      flushPara(paraBuf); paraBuf = [];
      out.push('<h3>' + escapeHtml(line.slice(4)) + '</h3>');
    } else if (line.trim() === '') {
      flushPara(paraBuf); paraBuf = [];
    } else {
      paraBuf.push(line);
    }
  }
  flushPara(paraBuf);
  return out.join('\n');
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setupReflectionForm() {
  $('#reflectionWeekInput').addEventListener('change', (e) => {
    reflectionSelectedWeek = weekStart(e.target.value);
    renderReflection();
  });
  $('#reflectionSaveBtn').addEventListener('click', () => {
    const answers = REFLECTION_PROMPTS.map((_, i) => $(`#reflection_${i}`).value);
    const content = buildReflectionContent(answers);
    saveReflection(reflectionSelectedWeek, content);
    $('#reflectionSaveStatus').textContent = `Saved.`;
    setTimeout(() => $('#reflectionSaveStatus').textContent = '', 3000);
    renderReflection();
  });
}

/* ====================== SETTINGS ====================== */

function setupSettingsForm() {
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([exportStateJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hako-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#importBtn').addEventListener('click', () => $('#importFileInput').click());

  $('#importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importStateJSON(ev.target.result);
        alert('Imported successfully.');
        showTab('home');
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('This will wipe all your buckets, logs, and reflections. Continue?')) return;
    resetAllData();
    showTab('home');
  });
}

/* ====================== INIT ====================== */

function init() {
  loadState();
  applyTheme();

  const today = todayISO();
  $('#todayDisplay').textContent = humanDate(today);

  // Theme toggle
  $('#themeToggleBtn').addEventListener('click', toggleTheme);

  setupNavigation();
  setupItemForm();
  setupDailyForm();
  setupReflectionForm();
  setupSettingsForm();

  // Initial date defaults
  dailySelectedDate = today;
  reflectionSelectedWeek = weekStart(today);

  showTab('home');
}

document.addEventListener('DOMContentLoaded', init);
