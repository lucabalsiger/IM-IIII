let charts = {};

async function checkAuth() {
  const res  = await fetch('api/me.php');
  const data = await res.json();
  if (!data.success) window.location.href = 'login.html';
}

function makeChart(id, color) {
  const ctx = document.getElementById(id).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: color,
        borderWidth: 2,
        fill: true,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ',0.1)'),
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointBorderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          display: true,
          position: 'right',
          ticks: { color: '#7888aa', font: { size: 10 }, maxTicksLimit: 4 },
          grid:  { color: 'rgba(255,255,255,0.04)' },
          border: { display: false },
        },
      },
      animation: false,
    }
  });
}

function setBadge(id, isOptimal) {
  const el = document.getElementById(id);
  el.textContent = isOptimal ? 'Optimal' : 'Warning';
  el.className   = 'badge ' + (isOptimal ? 'optimal' : 'warning');
}

function updateChart(chart, data) {
  chart.data.labels            = data.map((_, i) => i);
  chart.data.datasets[0].data  = data;
  chart.update('none');
}

async function loadData() {
  try {
    const res  = await fetch('api/sensor.php?type=environment&limit=20');
    const json = await res.json();
    if (!json.success || !json.data.length) return;

    const rows   = json.data;
    const latest = rows[rows.length - 1];

    document.getElementById('temp-val').textContent     = parseFloat(latest.temperature).toFixed(1) + '°C';
    document.getElementById('humidity-val').textContent = parseFloat(latest.humidity).toFixed(0) + '%';
    document.getElementById('light-val').textContent    = parseInt(latest.light_level) + ' lux';

    setBadge('temp-badge',     latest.temperature >= 18 && latest.temperature <= 22);
    setBadge('humidity-badge', latest.humidity    >= 40 && latest.humidity    <= 60);
    setBadge('light-badge',    latest.light_level <= 10);

    updateChart(charts.temp,     rows.map(d => parseFloat(d.temperature)));
    updateChart(charts.humidity, rows.map(d => parseFloat(d.humidity)));
    updateChart(charts.light,    rows.map(d => parseInt(d.light_level)));
  } catch (e) {
    console.error(e);
  }
}

checkAuth().then(() => {
  charts.temp     = makeChart('temp-chart',     'rgb(255,112,67)');
  charts.humidity = makeChart('humidity-chart', 'rgb(74,158,255)');
  charts.light    = makeChart('light-chart',    'rgb(255,209,102)');
  loadData();
  setInterval(loadData, 10000);
});
