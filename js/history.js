const params  = new URLSearchParams(location.search);
const sensor  = params.get('sensor') || 'temp';

const config = {
  temp:     { label: 'Temperature', unit: '°C',  color: 'rgb(255,112,67)',  getValue: d => parseFloat(d.temperature) },
  humidity: { label: 'Humidity',    unit: '%',   color: 'rgb(74,158,255)',  getValue: d => parseFloat(d.humidity) },
  sound:    { label: 'Sound Level', unit: ' dB', color: 'rgb(168,85,247)', getValue: d => parseInt(d.sound_level) },
};

const cfg = config[sensor] || config.temp;

document.getElementById('page-title').textContent = cfg.label + ' History';
document.getElementById('page-sub').textContent   = 'Daily averages';

let chart = null;
let activeDays = 7;

async function checkAuth() {
  const res  = await fetch('api/me.php');
  const data = await res.json();
  if (!data.success) window.location.href = 'login.html';
}

function aggregateByDay(rows) {
  const byDay = {};
  rows.forEach(d => {
    const day = d.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(cfg.getValue(d));
  });

  const days = Object.keys(byDay).sort();
  return {
    labels: days.map(d => {
      const [, m, day] = d.split('-');
      return `${day}.${m}`;
    }),
    values: days.map(day => {
      const vals = byDay[day];
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    }),
    all: days.flatMap(day => byDay[day]),
  };
}

function initChart(labels, values) {
  const ctx = document.getElementById('main-chart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: cfg.color,
        borderWidth: 2,
        fill: true,
        backgroundColor: cfg.color.replace('rgb', 'rgba').replace(')', ',0.08)'),
        tension: 0.4,
        spanGaps: true,
        pointRadius: values.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: cfg.color,
        pointBorderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: item => ' ' + item.parsed.y + cfg.unit,
          },
          backgroundColor: '#0d1730',
          titleColor: '#7888aa',
          bodyColor: '#f0f4ff',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 10,
        },
      },
      scales: {
        x: {
          display: true,
          ticks: {
            color: '#7888aa',
            font: { size: 9 },
            maxTicksLimit: 7,
            maxRotation: 0,
          },
          grid:   { display: false },
          border: { display: false },
        },
        y: {
          display: true,
          position: 'right',
          ticks: { color: '#7888aa', font: { size: 10 }, maxTicksLimit: 4 },
          grid:   { color: 'rgba(255,255,255,0.04)' },
          border: { display: false },
        },
      },
    },
  });
}

async function loadData(days) {
  const res  = await fetch(`api/sensor.php?type=environment&days=${days}`);
  const json = await res.json();

  if (!json.success || !json.data.length) {
    document.getElementById('stat-min').textContent = '—';
    document.getElementById('stat-avg').textContent = '—';
    document.getElementById('stat-max').textContent = '—';
    initChart([], []);
    return;
  }

  const { labels, values, all } = aggregateByDay(json.data);

  initChart(labels, values);

  const min = Math.min(...all);
  const max = Math.max(...all);
  const avg = Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10;

  document.getElementById('stat-min').textContent = min + cfg.unit;
  document.getElementById('stat-avg').textContent = avg + cfg.unit;
  document.getElementById('stat-max').textContent = max + cfg.unit;
}

document.querySelectorAll('.range-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.range-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeDays = parseInt(tab.dataset.days);
    loadData(activeDays);
  });
});

checkAuth().then(() => loadData(activeDays));
