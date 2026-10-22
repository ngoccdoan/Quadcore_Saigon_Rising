/* Saigon Rising — game rules and flood simulation (no DOM code here). */

if (typeof module !== 'undefined') Object.assign(globalThis, require('./data.js'));

function makeRng(seed) {               // small deterministic RNG so a seed replays the same weather
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

function newGame(seed = Date.now()) {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const type = MAP_ROWS[r][c];
      const noise = (((c * 73 + r * 151 + c * r * 7) % 17) / 17 - 0.5) * 0.24;
      let elev = 0.72 + 0.16 * (c - 1) + noise - (r === 2 || r === 4 ? 0.08 : 0);
      if (type === 'R') elev = 0;
      if (type === 'C') elev = 0.2;
      row.push({ r, c, type, elev: +elev.toFixed(2), drain: false, dike: false, gate: false,
                 raised: 0, water: 0, lastDepth: 0, tideHit: false });
    }
    grid.push(row);
  }
  const g = { seed, rng: makeRng(seed), grid, round: 0, budget: START_BUDGET, happiness: START_HAPPINESS,
              policy: false, history: [], built: {}, over: false, result: null };
  g.forecast = makeForecast(g);
  return g;
}

function yearOf(round) { return START_YEAR + round * YEAR_STEP; }

function makeForecast(g) {
  const i = g.round, rnd = g.rng;
  const storm = i === 3 || i === 7 || i === 10;
  const kingTide = rnd() < 0.4 || i === 11;
  const tide = 1.0 + 0.035 * i + rnd() * 0.25 + (kingTide ? 0.18 : 0);
  const rain = 50 + 6 * i + rnd() * 45 + (storm ? 100 : 0);
  return { tide: +tide.toFixed(2), rain: Math.round(rain), storm, kingTide };
}

const inside = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS;
function neighbours(g, cell) {
  return [[-1, 0], [1, 0], [0, -1], [0, 1]]
    .map(([dr, dc]) => [cell.r + dr, cell.c + dc]).filter(([r, c]) => inside(r, c))
    .map(([r, c]) => g.grid[r][c]);
}
const isLand = cell => cell.type !== 'R' && cell.type !== 'C';
const nextToRiver = (g, cell) => neighbours(g, cell).some(n => n.type === 'R');
const allCells = g => g.grid.flat();
const isMouth = cell => cell.r === CANAL_MOUTH.r && cell.c === CANAL_MOUTH.c;

/* ---------- building ---------- */
function buildError(g, toolId, cell) {
  const t = TOOLS.find(x => x.id === toolId);
  if (!t || toolId === 'inspect') return 'Nothing to build.';
  if (t.cost > 0 && g.budget < t.cost) return `Not enough money (needs ₫${t.cost}B).`;
  const ty = cell.type;
  switch (toolId) {
    case 'drain':
      if (!['H', 'A', 'M', 'S', 'E', 'P'].includes(ty)) return 'Drains go on streets: homes, apartments, market, school, lots or parks.';
      if (cell.drain) return 'This block already has drains.';
      return null;
    case 'park': return ty === 'E' ? null : 'Parks go on empty lots.';
    case 'pond': return ty === 'E' || ty === 'W' ? null : 'Ponds go on empty lots or wetland.';
    case 'mangrove':
      if (!(ty === 'E' || ty === 'W')) return 'Mangroves go on empty lots or wetland.';
      return nextToRiver(g, cell) ? null : 'Mangroves need to be on the riverbank.';
    case 'dike':
      if (!isLand(cell)) return 'Dikes are built on land.';
      if (!nextToRiver(g, cell)) return 'Dikes go on blocks that touch the river.';
      return cell.dike ? 'Already walled.' : null;
    case 'gate':
      if (!isMouth(cell)) return 'The tide gate can only go where the canal meets the river.';
      return cell.gate ? 'The gate is already built.' : null;
    case 'raise':
      if (!['H', 'A', 'M', 'S'].includes(ty)) return 'Only homes, apartments, the market and the school can be raised.';
      return cell.raised >= 2 ? 'Already raised as high as it can go.' : null;
    case 'develop': return ty === 'E' || ty === 'W' ? null : 'Developers only buy empty lots or wetland.';
  }
  return 'Unknown tool.';
}

function build(g, toolId, cell) {
  const err = buildError(g, toolId, cell);
  if (err) return err;
  const t = TOOLS.find(x => x.id === toolId);
  g.budget -= t.cost;
  g.built[toolId] = (g.built[toolId] || 0) + 1;
  switch (toolId) {
    case 'drain': cell.drain = true; break;
    case 'park': cell.type = 'P'; break;
    case 'pond': cell.type = 'O'; break;
    case 'mangrove': cell.type = 'G'; break;
    case 'dike': cell.dike = true; break;
    case 'gate': cell.gate = true; break;
    case 'raise': cell.raised++; cell.elev = +(cell.elev + RAISE_STEP).toFixed(2); break;
    case 'develop': cell.type = 'A'; break;
  }
  return null;
}

function buyPolicy(g) {
  if (g.policy) return 'Already in place.';
  if (g.budget < POLICY.cost) return `Not enough money (needs ₫${POLICY.cost}B).`;
  g.budget -= POLICY.cost; g.policy = true; g.built.policy = 1;
  return null;
}

/* ---------- one rainy season ---------- */
function tideBarrier(cell) {
  return cell.elev + (cell.dike ? DIKE_HEIGHT : 0) + (cell.type === 'G' ? MANGROVE_BUFFER : 0);
}
function floorOf(cell) { return cell.type === 'O' ? cell.elev - POND_DEPTH : cell.elev; }

function runSeason(g, f = g.forecast) {
  const wobble = 0.92 + g.rng() * 0.16;                 // forecasts are good, not perfect
  const tide = +(f.tide * (0.97 + g.rng() * 0.06)).toFixed(2);
  const rain = Math.round(f.rain * wobble);
  const cells = allCells(g);
  const gate = g.grid[CANAL_MOUTH.r][CANAL_MOUTH.c].gate;
  cells.forEach(c => { c.water = 0; c.tideHit = false; });

  // 1. the tide pushes in from the river (and up the canal unless it is gated)
  const queue = cells.filter(c => c.type === 'R');
  const seen = new Set(queue);
  while (queue.length) {
    const cur = queue.shift();
    for (const n of neighbours(g, cur)) {
      if (seen.has(n) || n.type === 'R') continue;
      if (n.type === 'C') {
        if (gate) continue;                              // the gate seals the canal
        seen.add(n); n.water = Math.max(0, tide - n.elev); queue.push(n);
      } else if (tideBarrier(n) < tide) {
        seen.add(n); n.water = tide - floorOf(n); n.tideHit = true; queue.push(n);
      }
    }
  }

  // 2. rain falls; hard surfaces shed most of it onto the street
  const rainM = rain / 1000;
  cells.forEach(c => { if (isLand(c)) c.water += rainM * TILE[c.type].runoff * RAIN_CONCENTRATION; });

  // 3. water flows downhill and out to the river / canal mouth
  const drainFactor = gate ? 1 : tide < 1.25 ? 1 : tide < 1.45 ? 0.5 : 0.2;
  const flowSteps = n => { for (let k = 0; k < n; k++) flowStep(g, cells, tide, gate); };
  flowSteps(14);

  // 4. drains pull water off the streets — only as fast as the outlets allow
  cells.filter(c => c.drain).forEach(c => {
    c.water = Math.max(0, c.water - 0.28 * drainFactor);
    neighbours(g, c).filter(isLand).forEach(n => { n.water = Math.max(0, n.water - 0.12 * drainFactor); });
  });
  cells.forEach(c => { if (isLand(c)) c.water = Math.max(0, c.water - 0.02); });   // seepage
  flowSteps(4);

  // 5. damage and money
  let peopleTotal = 0, peopleFlooded = 0, income = 0, repair = 0;
  const flooded = [];
  cells.forEach(c => {
    const depth = isLand(c) ? Math.max(0, c.water - (c.type === 'O' ? POND_DEPTH : 0)) : 0;
    c.lastDepth = +depth.toFixed(2);
    const t = TILE[c.type];
    const wet = depth > FLOOD_DEPTH;
    peopleTotal += t.people;
    if (wet && (t.people || t.income)) { flooded.push(c); peopleFlooded += t.people; repair += 3 + 4 * t.people; }
    income += wet ? t.income * 0.4 : t.income;
  });
  income = Math.round(income);
  const greenCells = cells.filter(c => ['W', 'P', 'O', 'G'].includes(c.type)).length;
  const floodShare = peopleTotal ? peopleFlooded / peopleTotal : 0;
  const happinessDelta = Math.round(8 - floodShare * 55 + Math.min(6, greenCells * 0.5)
                                    - (g.budget + income - repair < 0 ? 10 : 0));

  const report = {
    year: yearOf(g.round), tide, rain, storm: f.storm, kingTide: f.kingTide,
    peopleTotal, peopleFlooded, floodShare, income, repair, happinessDelta,
    floodedNames: flooded.map(c => TILE[c.type].name),
    tideCells: cells.filter(c => c.tideHit).length,
    drainBlocked: drainFactor < 1 && cells.some(c => c.drain),
    dikeTrap: cells.some(c => c.dike && c.lastDepth > FLOOD_DEPTH),
  };
  report.fact = pickFact(g, report);
  return report;
}

function flowStep(g, cells, tide, gate) {
  const delta = new Map();
  const add = (c, v) => delta.set(c, (delta.get(c) || 0) + v);
  for (const c of cells) {
    if (c.type === 'R' || c.water <= 0) continue;
    const s = floorOf(c) + c.water;
    const lower = neighbours(g, c).filter(n => n.type !== 'R' && floorOf(n) + n.water < s - 0.005);
    let budget = c.water * 0.5;
    for (const n of lower) {
      const move = Math.min(budget / lower.length, (s - floorOf(n) - n.water) * 0.25);
      if (move > 0) { add(c, -move); add(n, move); }
    }
    // outflow to the river: riverbank blocks without a dike, and the canal mouth
    if (isMouth(c)) {
      const minLevel = gate ? 0 : Math.max(0, tide - c.elev);
      const out = Math.min(gate ? 0.35 : 0.25, Math.max(0, c.water - minLevel));
      add(c, -out);
    } else if (isLand(c) && !c.dike && nextToRiver(g, c) && s > tide) {
      add(c, -Math.min(0.15, s - tide, c.water));
    }
  }
  delta.forEach((v, c) => { c.water = Math.max(0, c.water + v); });
}

function pickFact(g, rep) {
  if (g.round === 0) return FACTS.intro;
  if (rep.dikeTrap && !g._toldDike) { g._toldDike = 1; return FACTS.dikeTrap; }
  if (rep.drainBlocked && !g._toldDrain) { g._toldDrain = 1; return FACTS.drainBlocked; }
  if (rep.storm) return FACTS.storm;
  if (rep.kingTide && rep.tideCells && !g._toldTide) { g._toldTide = 1; return FACTS.kingTide; }
  const pool = ['subsidence', 'concrete', 'mangrove', 'sponge', 'people', 'climate']
    .filter(k => !(g._told || []).includes(k));
  const k = pool.length ? pool[g.round % pool.length] : 'climate';
  (g._told = g._told || []).push(k);
  return FACTS[k];
}

/* ---------- end of round ---------- */
function endRound(g, report) {
  g.budget = g.budget + report.income - report.repair;
  g.happiness = Math.max(0, Math.min(100, g.happiness + report.happinessDelta));
  g.history.push(report);
  const sink = g.policy ? SUBSIDENCE_POLICY : SUBSIDENCE;
  allCells(g).forEach(c => { if (isLand(c)) c.elev = +(c.elev - sink).toFixed(3); });
  g.round++;
  if (g.happiness <= 0) { g.over = true; g.result = finalResult(g, 'unrest'); }
  else if (g.round >= TOTAL_ROUNDS) { g.over = true; g.result = finalResult(g, 'complete'); }
  else g.forecast = makeForecast(g);
}

function finalResult(g, reason) {
  const tot = g.history.reduce((a, h) => a + h.peopleTotal, 0);
  const dry = g.history.reduce((a, h) => a + h.peopleTotal - h.peopleFlooded, 0);
  const safety = tot ? dry / tot : 0;
  let grade = safety >= 0.9 ? 'A' : safety >= 0.8 ? 'B' : safety >= 0.65 ? 'C' : safety >= 0.5 ? 'D' : 'F';
  if (reason === 'unrest') grade = 'F';
  const green = allCells(g).filter(c => ['W', 'P', 'O', 'G'].includes(c.type)).length;
  return { reason, safety, grade, green, budget: g.budget, happiness: g.happiness, years: g.round * YEAR_STEP };
}

if (typeof module !== 'undefined') module.exports = {
  newGame, makeForecast, runSeason, endRound, build, buildError, buyPolicy, neighbours,
  nextToRiver, isLand, isMouth, yearOf, allCells };
