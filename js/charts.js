/**
 * Hako — charts.js
 * Chart.js wrappers for the Dashboard tab. Theme-responsive (washi/sumi).
 */

let soulTallyChart = null;
let trendChart = null;
let exerciseChart = null;

function getThemeColors() {
  const isDark = HakoState.preferences.theme === 'dark';
  return {
    text:        isDark ? '#a89c87' : '#7a6f60',
    textStrong:  isDark ? '#f0e8d8' : '#2a2622',
    grid:        isDark ? 'rgba(245, 239, 230, 0.06)' : 'rgba(42, 38, 34, 0.08)',
    tooltipBg:   isDark ? '#322d27' : '#fbf6ee',
    tooltipText: isDark ? '#f0e8d8' : '#2a2622',
    tooltipBorder: isDark ? 'rgba(245, 239, 230, 0.18)' : 'rgba(42, 38, 34, 0.18)',
    anchor:      '#6b8e4e',   // bamboo
    soul:        '#d06a4c',   // persimmon
    floor:       '#b8975a',   // tea gold
    accent:      '#a83b28',   // rust
  };
}

// Washi-friendly per-item palette for stacked bar (earth tones).
const PALETTE = [
  '#6b8e4e', '#d06a4c', '#b8975a', '#a89e85', '#7c6f8f',
  '#3d5d80', '#c89252', '#5a8a4a', '#a83b28', '#8d6e63',
];
function colorForIndex(i) { return PALETTE[i % PALETTE.length]; }

function destroyAll() {
  if (soulTallyChart) { soulTallyChart.destroy(); soulTallyChart = null; }
  if (trendChart)     { trendChart.destroy();     trendChart = null; }
  if (exerciseChart)  { exerciseChart.destroy();  exerciseChart = null; }
}

const DEFAULT_FONT = "'Inter', sans-serif";

function commonScale(colors) {
  return {
    font: { family: DEFAULT_FONT, size: 11, weight: '500' },
    color: colors.text,
  };
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
        borderRadius: 3,
        barThickness: 22,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, max: 7, grid: { color: colors.grid }, ticks: { ...commonScale(colors), stepSize: 1 } },
        y: { grid: { display: false }, ticks: commonScale(colors) },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          titleFont: { family: DEFAULT_FONT, weight: '600' },
          bodyFont: { family: DEFAULT_FONT },
          padding: 10,
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
    borderRadius: 2,
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
        x: { stacked: true, grid: { display: false }, ticks: commonScale(colors) },
        y: { stacked: true, grid: { color: colors.grid }, ticks: commonScale(colors), beginAtZero: true,
             title: { display: true, text: 'Hours', color: colors.text, font: { family: DEFAULT_FONT, size: 11 } } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: colors.text, usePointStyle: true, padding: 12, font: { family: DEFAULT_FONT, size: 11 } } },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          padding: 10,
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
          backgroundColor: 'rgba(184, 151, 90, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: colors.floor,
          pointRadius: 4,
          pointHoverRadius: 6,
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
        x: { grid: { display: false }, ticks: commonScale(colors) },
        y: { beginAtZero: true, max: 7, grid: { color: colors.grid }, ticks: { ...commonScale(colors), stepSize: 1 } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: colors.text, usePointStyle: true, padding: 12, font: { family: DEFAULT_FONT, size: 11 } } },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          padding: 10,
        },
      },
    },
  });
}
