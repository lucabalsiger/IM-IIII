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
        spanGaps: true,
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
        x: {
          display: true,
          ticks: {
            color: '#7888aa',
            font: { size: 9 },
            maxTicksLimit: 8,
            maxRotation: 0,
          },
          grid: { display: false },
          border: { display: false },
        },
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

function slotData(rows, getValue) {
  const now    = new Date();
  const labels = [];
  const values = [];

  for (let i = 23; i >= 0; i--) {
    const slotEnd   = new Date(now - i * 3600000);
    const slotStart = new Date(slotEnd - 3600000);
    const hh = String(slotEnd.getHours()).padStart(2, '0');
    labels.push(`${hh}:00`);

    const inSlot = rows.filter(d => {
      const t = new Date(d.created_at);
      return t >= slotStart && t < slotEnd;
    });

    if (inSlot.length > 0) {
      const avg = inSlot.reduce((s, d) => s + getValue(d), 0) / inSlot.length;
      values.push(Math.round(avg * 10) / 10);
    } else {
      values.push(null);
    }
  }

  return { labels, values };
}

function updateChart(chart, rows, getValue, unit) {
  const { labels, values } = slotData(rows, getValue);
  chart.data.labels           = labels;
  chart.data.datasets[0].data = values;
  chart.options.plugins.tooltip.callbacks.label = item =>
    item.parsed.y !== null ? ' ' + item.parsed.y + ' ' + unit : ' No data';
  chart.options.plugins.tooltip.callbacks.title = items => items[0].label;
  chart.update('none');
}

async function loadData() {
  try {
    let res  = await fetch('api/sensor.php?type=environment&hours=24');
    let json = await res.json();
    if (json.success && !json.data.length) {
      res  = await fetch('api/sensor.php?type=environment&limit=50');
      json = await res.json();
    }
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
