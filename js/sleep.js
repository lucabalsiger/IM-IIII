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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div class="card-title" style="margin:0">Sleep Quality</div>
        <div class="legend">
          <div class="legend-item"><div class="legend-dot" style="background:#4a9eff"></div>Calm</div>
          <div class="legend-item"><div class="legend-dot" style="background:#fb923c"></div>Restless</div>
          <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>Awake</div>
        </div>
      </div>
      <div id="sleep-timeline" style="display:flex;height:36px;border-radius:10px;overflow:hidden;gap:1px"></div>
      <div style="display:flex;justify-content:space-between;margin-top:0.4rem">
        <span id="sleep-time-start" style="font-size:0.75rem;color:#7888aa"></span>
        <span id="sleep-time-end"   style="font-size:0.75rem;color:#7888aa"></span>
      </div>
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

  // Draw timeline
  const colorMap = { calm: '#4a9eff', restless: '#fb923c', awake: '#ef4444' };
  const total    = new Date(sleepData[sleepData.length - 1].created_at) - new Date(sleepData[0].created_at);
  const timeline = document.getElementById('sleep-timeline');

  for (let i = 0; i < sleepData.length - 1; i++) {
    const duration = new Date(sleepData[i + 1].created_at) - new Date(sleepData[i].created_at);
    const pct      = (duration / total) * 100;
    const seg      = document.createElement('div');
    seg.title      = `${fmt(sleepData[i].created_at)} — ${sleepData[i].quality}`;
    seg.style.cssText = `flex:0 0 ${pct}%;background:${colorMap[sleepData[i].quality]};opacity:0.85;border-radius:2px`;
    timeline.appendChild(seg);
  }

  document.getElementById('sleep-time-start').textContent = fmt(sleepData[0].created_at);
  document.getElementById('sleep-time-end').textContent   = fmt(sleepData[sleepData.length - 1].created_at);

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

  // Berechnung basierend auf echten Zeitstempeln
  let sleepMinutes = 0;
  for (let i = 0; i < sleepData.length - 1; i++) {
    if (sleepData[i].quality !== 'awake') {
      const diff = (new Date(sleepData[i + 1].created_at) - new Date(sleepData[i].created_at)) / 60000;
      sleepMinutes += diff;
    }
  }
  document.getElementById('total-sleep').textContent = Math.floor(sleepMinutes / 60) + 'h ' + (sleepMinutes % 60) + 'm';
  document.getElementById('wake-count').textContent  = wakeEvents.length;
}

checkAuth().then(load);
