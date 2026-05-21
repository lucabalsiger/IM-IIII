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
      plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => items[0].label,
              label: item => ' ' + item.parsed.y,
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

function updateChart(chart, rows, getValue, unit) {
  chart.data.labels           = rows.map(d =>
    new Date(d.created_at).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  );
  chart.data.datasets[0].data = rows.map(getValue);
  chart.options.plugins.tooltip.callbacks.label = item => ' ' + item.parsed.y + ' ' + unit;
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
    document.getElementById('sound-val').textContent    = parseInt(latest.sound_level) + ' dB';

    setBadge('temp-badge',     latest.temperature >= 18 && latest.temperature <= 22);
    setBadge('humidity-badge', latest.humidity    >= 40 && latest.humidity    <= 60);
    setBadge('sound-badge',    latest.sound_level <= 40);

    updateChart(charts.temp,     rows, d => parseFloat(d.temperature), '°C');
    updateChart(charts.humidity, rows, d => parseFloat(d.humidity),    '%');
    updateChart(charts.sound,    rows, d => parseInt(d.sound_level),   'dB');
  } catch (e) {
    console.error(e);
  }
}

checkAuth().then(() => {
  charts.temp     = makeChart('temp-chart',     'rgb(255,112,67)');
  charts.humidity = makeChart('humidity-chart', 'rgb(74,158,255)');
  charts.sound    = makeChart('sound-chart',    'rgb(168,85,247)');
  loadData();
  setInterval(loadData, 10000);
});
