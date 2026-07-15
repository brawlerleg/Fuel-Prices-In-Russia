const FLAG_RU = `<svg viewBox="0 0 9 6" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><rect width="9" height="6" fill="#fff"/><rect width="9" height="4" y="2" fill="#0039A6"/><rect width="9" height="2" y="4" fill="#D52B1E"/></svg>`;
const FLAG_GB = `<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><clipPath id="gb-s"><path d="M0,0 v30 h60 v-30 z"/></clipPath><clipPath id="gb-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><g clip-path="url(#gb-s)"><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#gb-t)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>`;

const PALETTE = {
  ink: '#e6edf3', slate: '#7d8590', grid: '#1c222b',
  alert: '#ff4d3d', signal: '#f5a623', panel: '#161b22'
};

const I18N = {
  ru: {
    locale: 'ru-RU',
    tag: 'Открытые данные · мониторинг',
    title: 'Топливный кризис 2026',
    lead: 'Каждый удар по нефтеперерабатывающему заводу — точка на карте времени. Кривая под ними — как часто россияне искали «нет бензина». Наведите курсор, чтобы прочитать любой день.',
    statStrikes: 'Ударов зафиксировано',
    statFacilities: 'Объектов под ударом',
    statCapacity: 'Суммарная мощность · Mt/год',
    statRange: 'Макс. дальность · км',
    panelTitle: 'Интерес к дефициту × удары по НПЗ',
    presets: [
      { days: 30, label: '30 дней' },
      { days: 90, label: '90 дней' },
      { days: 180, label: '180 дней' },
      { days: 0, label: 'Весь период' },
    ],
    legendLine: 'Поисковый запрос «нет бензина»',
    legendStrike: 'Удар по НПЗ · размер = мощность',
    footer: 'Корреляция во времени — не доказательство причины. Поисковый интерес отражает внимание, а не реальную цену на заправке.',
    srcWiki: 'Wikipedia', srcTrends: 'Google Trends', srcCode: 'Исходный код',
    capacity: 'Мощность', distance: 'Дальность', unitCap: 'Mt/год', unitDist: 'км',
  },
  en: {
    locale: 'en-GB',
    tag: 'Open data · monitoring',
    title: 'Russian Fuel Crisis 2026',
    lead: 'Every strike on an oil refinery is a point in time. The curve beneath them is how often Russians searched for “no petrol”. Hover to read any single day.',
    statStrikes: 'Strikes logged',
    statFacilities: 'Facilities hit',
    statCapacity: 'Combined capacity · Mt/yr',
    statRange: 'Max reach · km',
    panelTitle: 'Shortage interest × refinery strikes',
    presets: [
      { days: 30, label: '30 days' },
      { days: 90, label: '90 days' },
      { days: 180, label: '180 days' },
      { days: 0, label: 'Full range' },
    ],
    legendLine: 'Search query “no petrol”',
    legendStrike: 'Refinery strike · size = capacity',
    footer: 'Correlation over time is not proof of cause. Search interest reflects attention, not the actual price at the pump.',
    srcWiki: 'Wikipedia', srcTrends: 'Google Trends', srcCode: 'Source code',
    capacity: 'Capacity', distance: 'Distance', unitCap: 'Mt/yr', unitDist: 'km',
  }
};

let lang = 'ru';
let data = null;
let chart = null;
let activeDays = 90;

const crosshair = {
  id: 'crosshair',
  afterDraw(c) {
    const cross = c.$cross;
    if (!cross) return;
    const { ctx, chartArea, scales } = c;
    if (cross.x < chartArea.left || cross.x > chartArea.right) return;
    if (cross.y < chartArea.top || cross.y > chartArea.bottom) return;

    const trend = c.data.datasets[0].data;
    const xValue = scales.x.getValueForPixel(cross.x);
    let near = null, best = Infinity;
    for (const p of trend) {
      const d = Math.abs(new Date(p.x) - xValue);
      if (d < best) { best = d; near = p; }
    }
    if (!near) return;

    const px = scales.x.getPixelForValue(new Date(near.x));
    const py = scales.y.getPixelForValue(near.y);

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([3, 4]);
    ctx.moveTo(px, chartArea.top);
    ctx.lineTo(px, chartArea.bottom);
    ctx.strokeStyle = 'rgba(125,133,144,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.signal;
    ctx.strokeStyle = PALETTE.panel;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    const strikes = c.data.datasets[1].data;
    let overStrike = false;
    for (const s of strikes) {
      const sx = scales.x.getPixelForValue(new Date(s.x));
      const sy = scales.y.getPixelForValue(s.y);
      if (Math.hypot(sx - cross.x, sy - cross.y) <= s.r) { overStrike = true; break; }
    }

    if (!overStrike && Math.hypot(px - cross.x, py - cross.y) <= 26) {
      const dateStr = new Date(near.x).toLocaleDateString(I18N[lang].locale,
        { day: 'numeric', month: 'short', year: 'numeric' });
      const label = `${dateStr}   ${near.y}`;
      ctx.font = '12px ui-monospace, Menlo, monospace';
      const tw = ctx.measureText(label).width;
      const padX = 11, boxW = tw + padX * 2, boxH = 26;
      let boxX = px + 14;
      if (boxX + boxW > chartArea.right) boxX = px - boxW - 14;
      let boxY = py - boxH - 14;
      if (boxY < chartArea.top) boxY = py + 14;

      ctx.fillStyle = '#0d1117';
      ctx.strokeStyle = PALETTE.signal;
      ctx.lineWidth = 1;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = PALETTE.ink;
      ctx.textBaseline = 'middle';
      ctx.fillText(label, boxX + padX, boxY + boxH / 2 + 1);
    }
    ctx.restore();
  }
};
Chart.register(crosshair);

const timeUnitFor = (d) => d <= 35 ? 'day' : d <= 100 ? 'week' : d <= 400 ? 'month' : 'quarter';
const stepFor = (d) => d <= 35 ? Math.max(1, Math.round(d / 6))
  : d <= 100 ? Math.max(1, Math.round(d / 7 / 6))
  : Math.max(1, Math.round(d / 30 / 6));

const longDate = (iso) => new Date(iso).toLocaleDateString(I18N[lang].locale,
  { day: 'numeric', month: 'long', year: 'numeric' });

function absenceAt(trends, date) {
  let best = null, bd = Infinity;
  for (const t of trends) {
    const d = Math.abs(new Date(t.date) - new Date(date));
    if (d < bd) { bd = d; best = t; }
  }
  return best ? best.absence : 0;
}

function fillStats() {
  const t = I18N[lang];
  const strikes = lang === 'ru' ? data['strikes-ru'] : data.strikes;
  const facilities = new Set(strikes.map(s => s.facility));
  const capByFac = {};
  strikes.forEach(s => { if (s.capacity) capByFac[s.facility] = s.capacity; });
  const totalCap = Object.values(capByFac).reduce((a, b) => a + b, 0);
  const maxDist = Math.max(...strikes.map(s => s.distance || 0));

  document.getElementById('statStrikes').textContent = strikes.length;
  document.getElementById('statFacilities').textContent = facilities.size;
  document.getElementById('statCapacity').textContent = Math.round(totalCap);
  document.getElementById('statRange').textContent = maxDist.toLocaleString(t.locale);
}

function buildChart() {
  const t = I18N[lang];
  const trends = data.trends;
  const strikesArr = lang === 'ru' ? data['strikes-ru'] : data.strikes;
  const first = trends[0].date;
  const last = trends[trends.length - 1].date;
  const inRange = strikesArr.filter(s => s.date >= first && s.date <= last);

  if (chart) chart.destroy();
  const canvas = document.getElementById('chart');

  chart = new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        {
          key: 'absence',
          data: trends.map(tr => ({ x: tr.date, y: tr.absence })),
          borderColor: PALETTE.signal,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: true,
          backgroundColor: 'rgba(245,166,35,0.07)',
        },
        {
          key: 'strikes',
          type: 'bubble',
          data: inRange.map(s => ({
            x: s.date,
            y: absenceAt(trends, s.date),
            r: s.capacity ? Math.max(6, Math.sqrt(s.capacity) * 2.7) : 6,
            meta: s
          })),
          backgroundColor: 'rgba(255,77,61,0.32)',
          borderColor: PALETTE.alert,
          borderWidth: 1.5,
          hoverBackgroundColor: 'rgba(255,77,61,0.55)',
          hoverBorderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1117',
          titleColor: PALETTE.ink,
          bodyColor: PALETTE.slate,
          borderColor: PALETTE.alert,
          borderWidth: 1,
          padding: 13,
          titleFont: { family: 'ui-monospace, Menlo, monospace', weight: '600', size: 13 },
          bodyFont: { family: 'ui-monospace, Menlo, monospace', size: 12 },
          displayColors: false,
          filter: (item) => item.dataset.key === 'strikes',
          callbacks: {
            title: (items) => longDate(items[0].raw.meta.date),
            label: (ctx) => {
              const m = ctx.raw.meta;
              const out = [m.facility];
              if (m.capacity) out.push(`${t.capacity}: ${m.capacity} ${t.unitCap}`);
              if (m.distance) out.push(`${t.distance}: ${m.distance} ${t.unitDist}`);
              return out;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month',
            displayFormats: { day: 'd MMM', week: 'd MMM', month: 'MMM yy', quarter: 'QQ yy' }
          },
          grid: { color: PALETTE.grid, drawBorder: false },
          ticks: {
            color: PALETTE.slate,
            font: { family: 'ui-monospace, Menlo, monospace', size: 11 },
            maxRotation: 0
          },
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: PALETTE.grid, drawBorder: false },
          ticks: {
            color: PALETTE.slate,
            font: { family: 'ui-monospace, Menlo, monospace', size: 11 },
            stepSize: 25
          },
        }
      }
    }
  });

  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    chart.$cross = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    chart.draw();
  };
  canvas.onmouseleave = () => { chart.$cross = null; chart.draw(); };

  applyWindow(activeDays);
}

function applyWindow(days) {
  activeDays = days;
  const trends = data.trends;
  const first = trends[0].date;
  const last = trends[trends.length - 1].date;
  let from, to = last;
  if (days === 0) from = first;
  else {
    const s = new Date(last);
    s.setDate(s.getDate() - days);
    from = s.toISOString().slice(0, 10);
  }
  const wd = Math.round((new Date(to) - new Date(from)) / 86400000);
  chart.options.scales.x.min = from;
  chart.options.scales.x.max = to;
  chart.options.scales.x.time.unit = timeUnitFor(wd);
  chart.options.scales.x.time.stepSize = stepFor(wd);
  chart.update();
}

function renderText() {
  const t = I18N[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key] != null) el.textContent = t[key];
  });

  const box = document.getElementById('presets');
  box.innerHTML = '';
  t.presets.forEach(p => {
    const b = document.createElement('button');
    b.className = 'preset' + (p.days === activeDays ? ' on' : '');
    b.textContent = p.label;
    b.onclick = () => {
      document.querySelectorAll('#presets .preset').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      applyWindow(p.days);
    };
    box.appendChild(b);
  });

  document.getElementById('legend').innerHTML =
    `<div class="legend-item"><span class="dot line"></span>${t.legendLine}</div>` +
    `<div class="legend-item"><span class="dot strike"></span>${t.legendStrike}</div>`;
}

function setupToggle() {
  const toggle = document.getElementById('langToggle');
  const knob = document.getElementById('knob');
  document.getElementById('ghostL').innerHTML = FLAG_RU;
  document.getElementById('ghostR').innerHTML = FLAG_GB;
  knob.innerHTML = FLAG_RU;

  toggle.onclick = () => {
    lang = lang === 'ru' ? 'en' : 'ru';
    toggle.classList.toggle('ru', lang === 'ru');
    toggle.classList.toggle('en', lang === 'en');
    setTimeout(() => { knob.innerHTML = lang === 'ru' ? FLAG_RU : FLAG_GB; }, 140);
    renderText();
    fillStats();
    buildChart();
  };
}

fetch('data.json')
  .then(r => r.json())
  .then(d => {
    data = d;
    setupToggle();
    renderText();
    fillStats();
    buildChart();
  })
  .catch(err => {
    document.querySelector('.chart-frame').innerHTML =
      '<p style="font-family:var(--mono);color:var(--slate);padding:40px">data.json не загрузился. Запусти через локальный сервер: python -m http.server</p>';
  });
