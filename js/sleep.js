async function checkAuth() {
  const res  = await fetch('api/me.php');
  const data = await res.json();
  if (!data.success) window.location.href = 'login.html';
}

function fmt(dateStr) {
  return new Date(dateStr).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}

function qualityNum(q) {
  return q === 'calm' ? 2 : q === 'restless' ? 1 : 0;
}

async function load() {
  const today = new Date().toISOString().slice(0, 10);
  const d     = new Date(today);
  document.getElementById('date-label').textContent =
    'Last night • ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const [sleepRes, envRes] = await Promise.all([
    fetch('api/sensor.php?type=sleep&date=' + today),
    fetch('api/sensor.php?type=environment&limit=50'),
  ]);

  const sleepJson = await sleepRes.json();
  const envJson   = await envRes.json();
  const content   = document.getElementById('content');

  if (!sleepJson.success || !sleepJson.data.length) {
    content.innerHTML = '<div class="no-data">Keine Schlafdaten für diese Nacht gefunden.</div>';
    content.innerHTML += '<a href="insights.html" class="nav-btn">View AI Insights <span>›</span></a>';
    return;
  }

  const sleepData = sleepJson.data;
  const envData   = envJson.success ? envJson.data : [];

  // Sleep quality chart
  content.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title" style="margin:0">Sleep Quality</div>
        <div class="legend">
          <div class="legend-item"><div class="legend-dot" style="background:#4a9eff"></div>Calm</div>
          <div class="legend-item"><div class="legend-dot" style="background:#fb923c"></div>Restless</div>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="sleep-chart"></canvas></div>
    </div>
    <div id="wake-events"></div>
    <div class="card">
      <div class="card-title">Environmental Factors</div>
      <ul class="factors-list">
        <li><span class="lbl">Avg. Temperature</span><span class="val" id="avg-temp">—</span></li>
        <li><span class="lbl">Avg. Humidity</span><span class="val" id="avg-hum">—</span></li>
        <li><span class="lbl">Avg. Sound Level</span><span class="val" id="avg-sound">—</span></li>
        <li><span class="lbl">Total Sleep</span><span class="val" id="total-sleep">—</span></li>
        <li><span class="lbl">Wake Events</span><span class="val" id="wake-count">—</span></li>
      </ul>
    </div>
    <a href="insights.html" class="nav-btn">View AI Insights <span>›</span></a>
  `;

  // Draw chart
  const ctx = document.getElementById('sleep-chart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: sleepData.map(d => fmt(d.created_at)),
      datasets: [{
        data: sleepData.map(d => qualityNum(d.quality)),
        borderWidth: 2,
        stepped: true,
        fill: true,
        backgroundColor: 'rgba(74,158,255,0.08)',
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#4a9eff',
        pointBorderWidth: 0,
        segment: {
          borderColor: ctx => {
            const v = ctx.p0.parsed.y;
            return v === 2 ? '#4a9eff' : v === 1 ? '#fb923c' : '#ef4444';
          }
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: '#7888aa', maxTicksLimit: 6, font: { size: 11 } },
          grid:  { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          min: -0.3, max: 2.3,
          ticks: {
            color: '#7888aa',
            stepSize: 1,
            callback: v => v === 2 ? 'Calm' : v === 1 ? 'Restless' : v === 0 ? 'Awake' : '',
            font: { size: 11 },
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { display: false },
        }
      }
    }
  });

  // Wake events
  const wakeEvents = [];
  for (let i = 1; i < sleepData.length; i++) {
    if (sleepData[i].quality === 'awake' && sleepData[i - 1].quality !== 'awake') {
      wakeEvents.push(sleepData[i]);
    }
  }

  const wakeContainer = document.getElementById('wake-events');
  wakeEvents.forEach(ev => {
    const el = document.createElement('div');
    el.className = 'wake-event';
    el.innerHTML = `
      <div class="wake-icon">⚠️</div>
      <div>
        <div class="wake-title">Wake Event at ${fmt(ev.created_at)}</div>
        <div class="wake-desc">Sleep was interrupted</div>
      </div>
    `;
    wakeContainer.appendChild(el);
  });

  // Environmental factors
  if (envData.length) {
    const avgTemp  = (envData.reduce((s, d) => s + parseFloat(d.temperature), 0) / envData.length).toFixed(1);
    const avgHum   = Math.round(envData.reduce((s, d) => s + parseFloat(d.humidity), 0) / envData.length);
    const avgSound = Math.round(envData.reduce((s, d) => s + parseInt(d.sound_level), 0) / envData.length);
    document.getElementById('avg-temp').textContent  = avgTemp + '°C';
    document.getElementById('avg-hum').textContent   = avgHum + '%';
    document.getElementById('avg-sound').textContent = avgSound + ' dB';
  }

  const sleepMinutes = sleepData.filter(d => d.quality !== 'awake').length * 5;
  document.getElementById('total-sleep').textContent = Math.floor(sleepMinutes / 60) + 'h ' + (sleepMinutes % 60) + 'm';
  document.getElementById('wake-count').textContent  = wakeEvents.length;
}

checkAuth().then(load);
