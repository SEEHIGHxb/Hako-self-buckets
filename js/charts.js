/**
 * Hako — charts.js
 * Chart.js wrappers for the Dashboard tab. Theme-responsive.
 */

let soulTallyChart = null;
let trendChart = null;
let exerciseChart = null;

function getThemeColors() {
  const isDark = HakoState.preferences.theme === 'dark';
  return {
    text:        isDark ? '#b5cbb7' : '#2d5a27',
    grid:        isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    tooltipBg:   isDark ? 'rgba(20, 30, 20, 0.92)' : 'rgba(240, 245, 240, 0.95)',
    tooltipText: isDark ? '#e2ebd5' : '#1e381b',
    anchor:      '#4d9c4e',
    soul:        '#a2d2a4',
    floor:       '#cfa87b',
    accent:      '#e07a5f',
  };
}

// Pleasant per-item color palette for stacked bar.
const PALETTE = [
  '#4d9c4e', '#a2d2a4', '#8ba88f', '#cfa87b', '#6d597a',
  '#355070', '#e09f53', '#31572c', '#5a7d5b', '#e5989b',
];
function colorForIndex(i) { return PALETTE[i % PALETTE.length]; }

function destroyAll() {
  if (soulTallyChart) { soulTallyChart.destroy(); soulTallyChart = null; }
  if (trendChart)     { trendChart.destroy();     trendChart = null; }
  if (exerciseChart)  { exerciseChart.destroy();  exerciseChart = null; }
}

/* ---------- Soul stuff tally (current week) ---------- */

function renderSoulTally(canvasId, weekMondayIso) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const colors = getThemeColors();

  const soulItems = listItemsByKind('soul', { activeOnly: true }).filter(isItemBinary);
  const counts = weeklyDidCountsByItem(weekMondayIso);

  const labels = soulItems.map(i => i.name);
  const data = soulItems.map(i => counts[i.id] || 0);

  if (soulTallyChart) soulTallyChart.destroy();
  soulTallyChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.soul,
        borderRadius: 6,
        barThickness: 22,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, max: 7, grid: { color: colors.grid }, ticks: { color: colors.text, stepSize: 1 } },
        y: { grid: { display: false }, ticks: { color: colors.text } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          callbacks: { label: (ctx) => `${ctx.parsed.x} / 7 days` },
        },
      },
    },
  });
}

/* ---------- 8-week trend (stacked bar of hours per item) ---------- */

function renderTrend(canvasId, weeks, items, weeklyHoursByWeek) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const colors = getThemeColors();

  const datasets = items.map((item, idx) => ({
    label: item.name,
    data: weeks.map(w => (weeklyHoursByWeek[w] && weeklyHoursByWeek[w][item.id]) || 0),
    backgroundColor: colorForIndex(idx),
    borderRadius: 4,
    stack: 'hours',
  }));

  const labels = weeks.map(w => shortDate(w));

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: colors.text } },
        y: { stacked: true, grid: { color: colors.grid }, ticks: { color: colors.text }, beginAtZero: true,
             title: { display: true, text: 'Hours', color: colors.text } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: colors.text, usePointStyle: true, padding: 12 } },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} h` },
        },
      },
    },
  });
}

/* ---------- Exercise line (count per week, target line) ---------- */

function renderExerciseLine(canvasId, weeks, weeklyCounts, target) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const colors = getThemeColors();

  const data = weeks.map(w => weeklyCounts[w] || 0);
  const labels = weeks.map(w => shortDate(w));

  if (exerciseChart) exerciseChart.destroy();
  exerciseChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Exercise days',
          data,
          borderColor: colors.floor,
          backgroundColor: 'rgba(207, 168, 123, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: colors.floor,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: `Target (${target}/wk)`,
          data: weeks.map(() => target),
          borderColor: colors.anchor,
          borderDash: [6, 6],
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: colors.text } },
        y: { beginAtZero: true, max: 7, grid: { color: colors.grid }, ticks: { color: colors.text, stepSize: 1 } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: colors.text, usePointStyle: true, padding: 12 } },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
        },
      },
    },
  });
}
