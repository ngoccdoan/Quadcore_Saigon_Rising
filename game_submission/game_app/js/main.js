/* Saigon Rising — screens, board rendering, input and the season sequence. */

(() => {
  const $ = id => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(res => setTimeout(res, reduceMotion ? Math.min(ms, 150) : ms));
  const fmtPeople = units => (units * 1000).toLocaleString('en-US');
  const GAUGE_MIN = 0, GAUGE_MAX = 2.4;            // metres shown on the tide staff

  let g = null, tool = 'inspect', undoStack = [], busy = false, showHeights = false;

  /* ---------- screens ---------- */
  function show(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
    const focusable = $(`screen-${name}`).querySelector('button');
    if (focusable) focusable.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function startGame() {
    g = newGame(Date.now() % 1e9);
    tool = 'inspect'; undoStack = []; busy = false;
    show('play');
    buildBoard(); renderTray(); renderAll();
    toast('Pick a tool from the tray, then click a block. Hover to see heights.', 4200);
  }

  /* ---------- board ---------- */
  function buildBoard() {
    const board = $('board');
    board.innerHTML = ART.DEFS;
    board.style.setProperty('--cols', COLS); board.style.setProperty('--rows', ROWS);
    allCells(g).forEach(cell => {
      const el = document.createElement('button');
      el.className = 'cell'; el.type = 'button';
      el.dataset.r = cell.r; el.dataset.c = cell.c;
      el.setAttribute('role', 'gridcell');
      el.innerHTML = '<span class="art"></span><span class="water"></span><span class="ghost"></span><span class="height"></span>';
      el.addEventListener('click', () => onCell(cell));
      el.addEventListener('mouseenter', () => hoverCell(cell, el));
      el.addEventListener('focus', () => hoverCell(cell, el));
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('blur', hideTip);
      board.appendChild(el);
    });
  }
  const cellEl = cell => $('board').querySelector(`.cell[data-r="${cell.r}"][data-c="${cell.c}"]`);

  function renderCell(cell) {
    const el = cellEl(cell);
    el.querySelector('.art').innerHTML = ART.tile(cell, g);
    el.querySelector('.height').textContent = isLand(cell) ? cell.elev.toFixed(1) : '';
    const ghost = el.querySelector('.ghost');
    ghost.classList.toggle('on', cell.lastDepth > FLOOD_DEPTH && !busy);
    el.setAttribute('aria-label', `${TILE[cell.type].name}, ${isLand(cell) ? cell.elev.toFixed(2) + ' metres above the river' : 'water'}${cell.lastDepth > FLOOD_DEPTH ? ', flooded last season' : ''}`);
    el.classList.toggle('can-build', !busy && tool !== 'inspect' && !buildError(g, tool, cell));
  }
  function setWater(cell, depth) {
    const w = cellEl(cell).querySelector('.water');
    if (!isLand(cell)) { w.style.opacity = 0; return; }
    const d = cell.type === 'O' ? Math.max(0, depth - POND_DEPTH) : depth;
    w.style.opacity = d < 0.03 ? 0 : Math.min(0.9, 0.38 + d * 1.6);
    w.classList.toggle('deep', d > FLOOD_DEPTH);
  }

  function renderAll() {
    allCells(g).forEach(renderCell);
    $('board').classList.toggle('heights', showHeights);
    $('s-year').textContent = yearOf(g.round);
    $('s-budget').textContent = `₫${Math.round(g.budget)}B`;
    $('s-budget').classList.toggle('low', g.budget < 25);
    $('s-happy').textContent = g.happiness;
    $('s-happy-bar').style.width = `${g.happiness}%`;
    $('s-happy-bar').className = g.happiness < 30 ? 'danger' : '';
    const people = allCells(g).reduce((a, c) => a + TILE[c.type].people, 0);
    $('s-people').textContent = fmtPeople(people);

    const f = g.forecast;
    $('f-year').textContent = yearOf(g.round);
    $('f-rain').textContent = `${f.rain} mm`;
    $('f-tide').textContent = `${f.tide.toFixed(2)} m`;
    const notes = [];
    if (f.storm) notes.push('Tropical storm expected — very heavy rain.');
    if (f.kingTide) notes.push('King tide season: the river will run high.');
    if (!notes.length) notes.push('A normal rainy season.');
    $('f-note').textContent = notes.join(' ');
    $('f-note').classList.toggle('warn', f.storm || f.kingTide);
    setGauge(null, f.tide);

    const p = $('btn-policy');
    p.textContent = g.policy ? 'Clean piped water: in place' : `${POLICY.name} — ₫${POLICY.cost}B`;
    p.disabled = g.policy || busy;
    $('policy-desc').textContent = g.policy ? 'The ground has stopped sinking.' : POLICY.desc + ' Right now it sinks 4 cm every season.';
    $('btn-season').textContent = `Start the ${yearOf(g.round)} season`;
    $('btn-season').disabled = busy;
    $('btn-undo').disabled = busy || !undoStack.length;
    renderTray();
  }

  function setGauge(level, forecast) {
    const pct = v => `${Math.max(0, Math.min(100, (v - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN) * 100))}%`;
    if (forecast != null) { $('gauge-forecast').style.bottom = pct(forecast); $('gauge-forecast').querySelector('span').textContent = `${forecast.toFixed(2)} m`; }
    $('gauge-water').style.height = pct(level == null ? 0.8 : level);
  }

  function buildStaff() {
    const staff = $('gauge-staff');
    let html = '';
    for (let m = 0; m < GAUGE_MAX * 10; m++) {
      const v = m / 10;
      html += `<div class="band ${m % 2 ? 'b' : 'a'}">${m % 5 === 0 ? `<span>${v.toFixed(1)}</span>` : ''}</div>`;
    }
    staff.innerHTML = html;
  }

  /* ---------- tools ---------- */
  function renderTray() {
    const tray = $('tray');
    if (!tray.children.length) {
      TOOLS.forEach(t => {
        const b = document.createElement('button');
        b.className = 'tool'; b.type = 'button'; b.dataset.tool = t.id;
        b.innerHTML = `${ART.icon(t.id)}<span class="tool-name">${t.name}</span><span class="tool-cost">${t.cost === 0 ? 'free' : t.cost < 0 ? `+₫${-t.cost}B` : `₫${t.cost}B`}</span><kbd>${t.key}</kbd>`;
        b.addEventListener('click', () => selectTool(t.id));
        tray.appendChild(b);
      });
    }
    tray.querySelectorAll('.tool').forEach(b => {
      const t = TOOLS.find(x => x.id === b.dataset.tool);
      b.classList.toggle('active', t.id === tool);
      b.setAttribute('aria-pressed', t.id === tool);
      b.disabled = busy;
      b.classList.toggle('unaffordable', t.cost > 0 && g && g.budget < t.cost);
    });
    const t = TOOLS.find(x => x.id === tool);
    $('tool-name').textContent = t.id === 'inspect' ? 'Inspect' : `${t.name} · ${t.cost < 0 ? `earns ₫${-t.cost}B` : `₫${t.cost}B`}`;
    $('tool-desc').textContent = t.desc;
  }
  function selectTool(id) {
    if (busy) return;
    tool = id; SFX.click();
    renderAll();
  }

  function snapshot() {
    return JSON.stringify({ grid: g.grid, budget: g.budget, built: g.built, policy: g.policy });
  }
  function onCell(cell) {
    if (busy) return;
    if (tool === 'inspect') { hoverCell(cell, cellEl(cell), true); return; }
    const before = snapshot();
    const err = build(g, tool, cell);
    if (err) { SFX.error(); toast(err); return; }
    undoStack.push(before); SFX.build();
    const el = cellEl(cell); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    renderAll();
  }
  function undo() {
    if (busy || !undoStack.length) return;
    const s = JSON.parse(undoStack.pop());
    s.grid.forEach((row, r) => row.forEach((c, k) => Object.assign(g.grid[r][k], c)));
    g.budget = s.budget; g.built = s.built; g.policy = s.policy;
    SFX.click(); renderAll();
  }

  /* ---------- tooltip & toast ---------- */
  function hoverCell(cell, el) {
    const t = TILE[cell.type], tip = $('tooltip');
    const lines = [`<b>${t.name}</b> <span class="vi">${t.vi}</span>`];
    if (isLand(cell)) {
      lines.push(`${cell.elev.toFixed(2)} m above the river`);
      if (t.people) lines.push(`${fmtPeople(t.people)} residents`);
      const extras = [cell.drain && 'drains', cell.dike && 'dike', cell.raised && `raised ×${cell.raised}`].filter(Boolean);
      if (extras.length) lines.push(`Has ${extras.join(', ')}`);
      if (g.history.length) lines.push(cell.lastDepth > FLOOD_DEPTH ? `<span class="wet">Flooded ${Math.round(cell.lastDepth * 100)} cm last season</span>` : 'Stayed dry last season');
    } else if (cell.gate) lines.push('Tide gate and pump');
    else if (cell.type === 'C' && isMouth(cell)) lines.push('Canal mouth — the tide gate goes here');
    if (tool !== 'inspect') {
      const err = buildError(g, tool, cell);
      lines.push(err ? `<span class="no">${err}</span>` : `<span class="yes">Click to build</span>`);
    }
    tip.innerHTML = lines.join('<br>');
    tip.hidden = false;
    const wrap = $('board').getBoundingClientRect(), r = el.getBoundingClientRect();
    let x = r.left - wrap.left + r.width / 2, y = r.top - wrap.top;
    tip.style.left = `${Math.max(90, Math.min(wrap.width - 90, x))}px`;
    tip.style.top = `${y}px`;
    tip.classList.toggle('below', y < 90);
  }
  function hideTip() { $('tooltip').hidden = true; }
  let toastTimer = null;
  function toast(msg, ms = 2600) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  /* ---------- rain canvas ---------- */
  let rainRAF = null;
  function rainStart(intensity) {
    const cv = $('rain'), box = $('board').getBoundingClientRect();
    cv.width = box.width; cv.height = box.height; cv.classList.add('on');
    if (reduceMotion) return;
    const ctx = cv.getContext('2d');
    const drops = Array.from({ length: Math.round(120 + 380 * intensity) }, () => ({
      x: Math.random() * cv.width, y: Math.random() * cv.height, v: 9 + Math.random() * 8 }));
    const frame = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = 'rgba(220,235,245,.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
      drops.forEach(d => {
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + 12);
        d.y += d.v; d.x -= 1.5;
        if (d.y > cv.height) { d.y = -12; d.x = Math.random() * (cv.width + 40); }
      });
      ctx.stroke();
      rainRAF = requestAnimationFrame(frame);
    };
    frame();
  }
  function rainStop() {
    cancelAnimationFrame(rainRAF);
    const cv = $('rain'); cv.classList.remove('on');
    cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  }

  /* ---------- the season ---------- */
  async function startSeason() {
    if (busy || g.over) return;
    busy = true; hideTip(); $('toast').hidden = true; renderAll();
    $('board').classList.add('season');
    const f = g.forecast, intensity = Math.min(1, f.rain / 220);
    rainStart(intensity); SFX.rainStart(intensity);
    if (f.storm) { await wait(400); SFX.thunder(); }
    await wait(900);
    const report = runSeason(g, f);
    setGauge(report.tide, null);
    await wait(700);
    allCells(g).forEach(c => setWater(c, c.lastDepth + (c.type === 'O' ? POND_DEPTH : 0)));
    await wait(1700);
    rainStop(); SFX.rainStop();
    showReport(report);
  }

  function showReport(rep) {
    const flooded = rep.peopleFlooded, share = rep.floodShare;
    $('rep-title').textContent = flooded === 0 ? `${rep.year}: every home stayed dry` : `${rep.year}: ${fmtPeople(flooded)} people flooded`;
    $('rep-sub').textContent = `${rep.rain} mm of rain${rep.storm ? ' from a tropical storm' : ''}, and the tide peaked at ${rep.tide.toFixed(2)} m.`;
    const causes = [];
    if (rep.tideCells) causes.push(`The tide pushed onto ${rep.tideCells} block${rep.tideCells > 1 ? 's' : ''}.`);
    if (rep.drainBlocked) causes.push('High water at the outlets slowed your drains.');
    if (rep.dikeTrap) causes.push('Rain pooled behind a dike.');
    const happy = rep.happinessDelta;
    $('rep-rows').innerHTML = `
      <div class="rep-row"><span>Residents flooded</span><b class="${share > 0.25 ? 'bad' : share > 0 ? 'meh' : 'good'}">${Math.round(share * 100)}%</b></div>
      <div class="rep-row"><span>Tax income</span><b>+₫${rep.income}B</b></div>
      <div class="rep-row"><span>Flood repairs</span><b class="${rep.repair ? 'bad' : ''}">−₫${rep.repair}B</b></div>
      <div class="rep-row"><span>Happiness</span><b class="${happy < 0 ? 'bad' : 'good'}">${happy >= 0 ? '+' : ''}${happy}</b></div>
      ${causes.length ? `<p class="rep-causes">${causes.join(' ')}</p>` : ''}`;
    $('rep-fact').textContent = rep.fact;
    $('btn-continue').textContent = g.round + 1 >= TOTAL_ROUNDS ? 'See how your plan did' : `Plan for ${yearOf(g.round + 1)}`;
    (share > 0.25 ? SFX.bad : SFX.good).call(SFX);
    $('report').showModal();
    $('report')._rep = rep;
  }

  function continueAfterReport() {
    const rep = $('report')._rep;
    $('report').close();
    endRound(g, rep);
    undoStack = []; busy = false;
    $('board').classList.remove('season');
    allCells(g).forEach(c => setWater(c, 0));
    if (g.over) { showResults(); return; }
    tool = tool === 'develop' ? 'inspect' : tool;
    renderAll();
    if (g.round === 1) toast('Blocks outlined in red flooded last season. The ground also sank 4 cm.', 4500);
  }

  /* ---------- results ---------- */
  function showResults() {
    const res = g.result;
    show('results');
    $('res-grade').textContent = res.grade;
    $('res-grade').className = `grade g-${res.grade}`;
    $('res-title').textContent = res.reason === 'unrest'
      ? `${START_YEAR + res.years}: residents have lost patience`
      : '2050: your plan is finished';
    const pct = Math.round(res.safety * 100);
    $('res-summary').textContent = res.reason === 'unrest'
      ? `Repeated flooding pushed happiness to zero after ${res.years} years, and the city replaced the planner. Across those years ${pct}% of residents stayed dry.`
      : `Across 24 years of monsoons, ${pct}% of residents stayed dry each season. ${
          res.grade === 'A' ? 'Bến Nước is one of the driest riverside districts in the city.'
        : res.grade === 'B' ? 'Most streets stay dry, but the worst storms still find the low blocks.'
        : res.grade === 'C' ? 'Some seasons went well, but many families still spent the rainy season wading.'
        : 'Floods became part of everyday life for most residents.'}`;

    const bars = g.history.map((h, i) => {
      const v = h.floodShare, hgt = Math.max(2, v * 120);
      return `<g><rect x="${i * 34 + 6}" y="${130 - hgt}" width="24" height="${hgt}" class="${v > 0.25 ? 'bar-bad' : v > 0 ? 'bar-meh' : 'bar-good'}"><title>${h.year}: ${Math.round(v * 100)}% flooded</title></rect>
        <text x="${i * 34 + 18}" y="146" text-anchor="middle">${String(h.year).slice(2)}</text></g>`;
    }).join('');
    $('res-chart').innerHTML = `<svg viewBox="0 0 ${Math.max(12, g.history.length) * 34 + 6} 150" role="img" aria-label="Share of residents flooded in each season">
      <line x1="0" y1="${130 - 0.25 * 120}" x2="9999" y2="${130 - 0.25 * 120}" class="ref"/>${bars}</svg>
      <p class="f-small">Bars above the dashed line mean more than a quarter of residents were flooded. Labels are years (’26 = 2026).</p>`;

    const b = g.built;
    $('res-stats').innerHTML = `
      <div><dt>Residents kept dry</dt><dd>${pct}%</dd></div>
      <div><dt>Green and water blocks</dt><dd>${res.green}</dd></div>
      <div><dt>Budget left</dt><dd>₫${Math.round(res.budget)}B</dd></div>
      <div><dt>Final happiness</dt><dd>${res.happiness}</dd></div>`;

    const L = [];
    if (b.gate) L.push('The tide gate let your drains keep working through king tides.');
    else L.push('Without a tide gate, the canal filled from the river and your drains had nowhere to send water. Try one at the canal mouth.');
    if (b.policy) L.push('Clean piped water stopped the land sinking — every centimetre counted later on.');
    else L.push(`The ground sank about ${Math.round(SUBSIDENCE * g.round * 100)} cm because groundwater pumping never stopped. That made every tide worse.`);
    if (b.develop) L.push(`You sold ${b.develop} block${b.develop > 1 ? 's' : ''} to developers. The money helped, but the concrete shed rain onto the neighbours.`);
    if ((b.pond || 0) + (b.park || 0) + (b.mangrove || 0) >= 3) L.push('Ponds, parks and mangroves worked like a sponge, holding water away from homes.');
    if (b.dike && !b.drain) L.push('Your dikes held back the river but trapped rain behind them without drains.');
    L.push(FACTS.climate);
    $('res-lessons').innerHTML = L.map(x => `<li>${x}</li>`).join('');
    SFX.good();
  }

  /* ---------- how-to legend ---------- */
  function buildLegend() {
    $('howto-tools').innerHTML = TOOLS.filter(t => t.id !== 'inspect').map(t =>
      `<div class="legend-item">${ART.icon(t.id)}<div><b>${t.name}</b> <span class="cost">${t.cost < 0 ? `earns ₫${-t.cost}B` : `₫${t.cost}B`}</span><p>${t.desc}</p></div></div>`).join('');
  }

  /* ---------- wiring ---------- */
  function syncSoundButtons() {
    ['btn-sound', 'btn-sound-menu'].forEach(id => {
      const b = $(id); b.setAttribute('aria-pressed', SFX.on);
      b.textContent = id === 'btn-sound-menu' ? (SFX.on ? 'Sound on' : 'Sound off') : (SFX.on ? 'Sound' : 'Muted');
    });
  }
  $('btn-start').onclick = startGame;
  $('btn-howto-start').onclick = startGame;
  $('btn-howto').onclick = () => show('howto');
  $('btn-howto-back').onclick = () => show('menu');
  $('btn-again').onclick = startGame;
  $('btn-res-menu').onclick = () => show('menu');
  $('btn-menu').onclick = () => { if (!busy) show('menu'); };
  $('btn-sound').onclick = $('btn-sound-menu').onclick = () => { SFX.toggle(); syncSoundButtons(); };
  $('btn-heights').onclick = () => { showHeights = !showHeights; $('btn-heights').setAttribute('aria-pressed', showHeights); renderAll(); };
  $('btn-undo').onclick = undo;
  $('btn-season').onclick = startSeason;
  $('btn-continue').onclick = continueAfterReport;
  $('report').addEventListener('cancel', e => e.preventDefault());   // must press the button to continue
  $('btn-policy').onclick = () => {
    if (busy) return;
    const before = snapshot(), err = buyPolicy(g);
    if (err) { SFX.error(); toast(err); return; }
    undoStack.push(before); SFX.build(); renderAll();
  };
  document.addEventListener('keydown', e => {
    if (!$('screen-play').classList.contains('active') || busy || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = TOOLS.find(x => x.key === e.key);
    if (t) { selectTool(t.id); e.preventDefault(); }
    else if (e.key === 'h' || e.key === 'H') $('btn-heights').click();
    else if (e.key === 'z' || e.key === 'Z') undo();
  });
  window.addEventListener('resize', hideTip);

  buildStaff(); buildLegend(); syncSoundButtons();
  window.__game = () => g;    // handy for debugging in the console
})();
