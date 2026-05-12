async function checkAuth() {
  const res  = await fetch('api/me.php');
  const data = await res.json();
  if (!data.success) window.location.href = 'login.html';
}

function addInsight(container, type, icon, title, text) {
  container.innerHTML += `
    <div class="insight-card ${type}">
      <div class="insight-icon">${icon}</div>
      <div>
        <div class="insight-title">${title}</div>
        <div class="insight-text">${text}</div>
      </div>
    </div>
  `;
}

async function load() {
  const today = new Date().toISOString().slice(0, 10);

  const [envRes, sleepRes] = await Promise.all([
    fetch('api/sensor.php?type=environment&limit=50'),
    fetch('api/sensor.php?type=sleep&date=' + today),
  ]);

  const envJson   = await envRes.json();
  const sleepJson = await sleepRes.json();

  const container = document.getElementById('insights-container');
  const scoreSection = document.getElementById('score-section');

  const envData   = envJson.success   ? envJson.data   : [];
  const sleepData = sleepJson.success ? sleepJson.data : [];

  let score = 100;
  let issues = 0;

  if (!envData.length && !sleepData.length) {
    container.innerHTML = '<div style="text-align:center;color:#7888aa;padding:3rem 1rem">Noch keine Daten vorhanden.</div>';
    return;
  }

  // Temperature analysis
  if (envData.length) {
    const avgTemp  = envData.reduce((s, d) => s + parseFloat(d.temperature), 0) / envData.length;
    const avgHum   = envData.reduce((s, d) => s + parseFloat(d.humidity), 0) / envData.length;
    const avgSound = envData.reduce((s, d) => s + parseInt(d.sound_level), 0) / envData.length;

    if (avgTemp > 23) {
      score -= 20; issues++;
      addInsight(container, 'warn', '🌡️', 'Room Too Warm',
        `Average temperature was ${avgTemp.toFixed(1)}°C — above the optimal range of 18–22°C. A cooler room promotes deeper sleep.`);
    } else if (avgTemp < 17) {
      score -= 15; issues++;
      addInsight(container, 'warn', '❄️', 'Room Too Cold',
        `Average temperature was ${avgTemp.toFixed(1)}°C — below the optimal range of 18–22°C. Consider warming the room slightly.`);
    } else {
      addInsight(container, 'good', '🌡️', 'Temperature Optimal',
        `Average temperature was ${avgTemp.toFixed(1)}°C — within the ideal sleep range of 18–22°C.`);
    }

    if (avgHum < 40) {
      score -= 15; issues++;
      addInsight(container, 'warn', '💧', 'Air Too Dry',
        `Average humidity was ${Math.round(avgHum)}% — below the optimal 40–60%. Dry air can irritate airways and disrupt sleep.`);
    } else if (avgHum > 60) {
      score -= 10; issues++;
      addInsight(container, 'warn', '💧', 'Humidity Too High',
        `Average humidity was ${Math.round(avgHum)}% — above the optimal 40–60%. High humidity can make sleep feel uncomfortable.`);
    } else {
      addInsight(container, 'good', '💧', 'Humidity Optimal',
        `Average humidity was ${Math.round(avgHum)}% — within the ideal range.`);
    }

    if (avgSound > 50) {
      score -= 20; issues++;
      addInsight(container, 'warn', '🔊', 'Too Noisy During Sleep',
        `Average sound level was ${Math.round(avgSound)} dB — above the recommended 40 dB for sleep. Noise disrupts sleep cycles and reduces deep sleep.`);
    } else if (avgSound > 40) {
      score -= 10;
      addInsight(container, 'info', '🔉', 'Slightly Elevated Noise',
        `Average sound level was ${Math.round(avgSound)} dB. Slightly above ideal — consider earplugs or a white noise machine.`);
    } else {
      addInsight(container, 'good', '🔇', 'Quiet Sleep Environment',
        `Average sound level was ${Math.round(avgSound)} dB — ideal conditions for uninterrupted sleep.`);
    }
  }

  // Sleep quality analysis
  if (sleepData.length) {
    const calm     = sleepData.filter(d => d.quality === 'calm').length;
    const restless = sleepData.filter(d => d.quality === 'restless').length;
    const awake    = sleepData.filter(d => d.quality === 'awake').length;
    const total    = sleepData.length;

    const calmPct = Math.round((calm / total) * 100);

    const wakeEvents = sleepData.filter((d, i) =>
      d.quality === 'awake' && (i === 0 || sleepData[i - 1].quality !== 'awake')
    ).length;

    if (wakeEvents > 2) {
      score -= 20; issues++;
      addInsight(container, 'warn', '😴', 'Frequent Wake Events',
        `${wakeEvents} wake events detected last night. Frequent interruptions reduce sleep quality and REM sleep.`);
    } else if (wakeEvents > 0) {
      score -= 5;
      addInsight(container, 'info', '😴', `${wakeEvents} Wake Event${wakeEvents > 1 ? 's' : ''}`,
        'Minor sleep interruptions detected. This is normal and not a major concern.');
    }

    if (calmPct >= 70) {
      addInsight(container, 'good', '⭐', 'Great Sleep Quality',
        `${calmPct}% of your sleep time was calm. Keep maintaining your current sleep environment!`);
    } else if (calmPct >= 50) {
      score -= 10;
      addInsight(container, 'info', '💤', 'Moderate Sleep Quality',
        `${calmPct}% calm sleep. Try reducing environmental disturbances for better rest.`);
    } else {
      score -= 25; issues++;
      addInsight(container, 'warn', '💤', 'Poor Sleep Quality',
        `Only ${calmPct}% of sleep was calm. Check temperature, noise, and humidity levels.`);
    }
  }

  // Score display
  const clampedScore = Math.max(0, score);
  const scoreClass   = clampedScore >= 80 ? 'score-good' : clampedScore >= 60 ? 'score-ok' : 'score-bad';
  const scoreLabel   = clampedScore >= 80 ? 'Great night' : clampedScore >= 60 ? 'Could be better' : 'Needs improvement';

  scoreSection.innerHTML = `
    <div class="score-card">
      <div class="score-label">Sleep Score</div>
      <div class="score-value ${scoreClass}">${clampedScore}</div>
      <div class="score-sub">${scoreLabel}</div>
    </div>
  `;
}

checkAuth().then(load);
