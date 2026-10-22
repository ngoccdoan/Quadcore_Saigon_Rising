/* Saigon Rising — top-down tile art as inline SVG (viewBox 0 0 64 64). */

const ART = (() => {
  const roofColors = ['#B4553A', '#A84A33', '#C0664A', '#9C4B3B'];
  const hash = (r, c) => (r * 31 + c * 17 + r * c) % 97;

  const ground = fill => `<rect width="64" height="64" fill="${fill}"/>`;
  const waterRipples = (fill, line) => `${ground(fill)}
    <path d="M4 18q6-4 12 0t12 0t12 0t12 0t12 0" stroke="${line}" stroke-width="2" fill="none" opacity=".55"/>
    <path d="M-6 40q6-4 12 0t12 0t12 0t12 0t12 0t12 0" stroke="${line}" stroke-width="2" fill="none" opacity=".4"/>`;

  function homes(r, c) {
    const h = hash(r, c), a = roofColors[h % 4], b = roofColors[(h + 1) % 4];
    return `${ground('#C9C2B4')}
      <rect x="0" y="29" width="64" height="7" fill="#9EA3A3"/>
      <g><rect x="5" y="5" width="24" height="20" fill="${a}"/><path d="M5 15h24" stroke="#00000033" stroke-width="2"/></g>
      <g><rect x="33" y="7" width="26" height="18" fill="${b}"/><path d="M46 7v18" stroke="#00000033" stroke-width="2"/></g>
      <g><rect x="6" y="40" width="22" height="19" fill="${b}"/><path d="M6 49h22" stroke="#00000033" stroke-width="2"/></g>
      <g><rect x="34" y="40" width="24" height="19" fill="${a}"/><path d="M46 40v19" stroke="#00000033" stroke-width="2"/></g>`;
  }
  function apartments() {
    let w = '';
    for (let y = 12; y < 54; y += 8) for (let x = 14; x < 50; x += 9) w += `<rect x="${x}" y="${y}" width="5" height="4" fill="#E9EEF0"/>`;
    return `${ground('#9EA3A3')}<rect x="8" y="6" width="48" height="52" fill="#6E7F8C"/><rect x="8" y="6" width="48" height="4" fill="#58687A"/>${w}`;
  }
  function market() {
    return `${ground('#C9C2B4')}
      <rect x="6" y="10" width="52" height="44" fill="#E8E1D0"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${6 + i * 8.66}" y="10" width="4.33" height="44" fill="#C8312B"/>`).join('')}
      <rect x="6" y="10" width="52" height="44" fill="none" stroke="#7A2A22" stroke-width="2"/>
      <circle cx="16" cy="60" r="2.5" fill="#E2A43B"/><circle cx="26" cy="60" r="2.5" fill="#6FA34B"/><circle cx="36" cy="60" r="2.5" fill="#E2A43B"/>`;
  }
  function school() {
    return `${ground('#C9C2B4')}
      <rect x="6" y="18" width="52" height="38" fill="#E7D58A"/><rect x="6" y="18" width="52" height="6" fill="#C9B25E"/>
      <rect x="26" y="40" width="12" height="16" fill="#8A6A3A"/>
      <path d="M32 4v14" stroke="#4A4A4A" stroke-width="1.5"/><rect x="32" y="4" width="11" height="7" fill="#C8312B"/>
      <path d="M37.5 5.8l.7 1.4 1.5.1-1.1 1 .3 1.5-1.4-.8-1.4.8.3-1.5-1.1-1 1.5-.1z" fill="#F2C230"/>`;
  }
  function wetland(r, c) {
    const h = hash(r, c);
    let reeds = '';
    for (let i = 0; i < 9; i++) {
      const x = 6 + ((h * (i + 3) * 7) % 52), y = 10 + ((h * (i + 5) * 11) % 44);
      reeds += `<path d="M${x} ${y + 8}l-2-8M${x} ${y + 8}v-9M${x} ${y + 8}l3-7" stroke="#3F7D4E" stroke-width="1.6" fill="none"/>`;
    }
    return `${ground('#9DB98C')}<ellipse cx="34" cy="36" rx="18" ry="10" fill="#7FAFC4" opacity=".7"/>${reeds}`;
  }
  function empty(r, c) {
    const h = hash(r, c);
    let d = '';
    for (let i = 0; i < 7; i++) d += `<circle cx="${8 + ((h * (i + 2) * 13) % 48)}" cy="${8 + ((h * (i + 4) * 7) % 48)}" r="1.6" fill="#8C8A62"/>`;
    return `${ground('#C8B48F')}<rect x="3" y="3" width="58" height="58" fill="none" stroke="#A8946E" stroke-width="1.5" stroke-dasharray="4 4"/>${d}`;
  }
  function park() {
    const t = (x, y, s) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#3F7D4E"/><circle cx="${x - s / 3}" cy="${y - s / 3}" r="${s / 2.4}" fill="#5C9A62"/>`;
    return `${ground('#8CBF79')}<path d="M0 50q20-10 64 2" stroke="#D9CBA4" stroke-width="5" fill="none"/>${t(16, 18, 9)}${t(46, 16, 8)}${t(30, 36, 7)}${t(52, 44, 6)}`;
  }
  function pond() {
    return `${ground('#8CBF79')}<rect x="7" y="9" width="50" height="46" rx="16" fill="#2E86C1"/><rect x="7" y="9" width="50" height="46" rx="16" fill="none" stroke="#C9C2B4" stroke-width="3"/>
      <path d="M16 30q5-3 10 0t10 0t10 0" stroke="#9FD0F0" stroke-width="1.8" fill="none"/>`;
  }
  function mangrove() {
    let m = '';
    [[14, 14], [36, 12], [52, 24], [22, 34], [44, 40], [14, 52], [34, 54]].forEach(([x, y]) => {
      m += `<path d="M${x} ${y}l-5 7M${x} ${y}l5 7M${x} ${y}v8" stroke="#5B4A33" stroke-width="1.4"/><circle cx="${x}" cy="${y - 2}" r="7" fill="#2F6B3F"/>`;
    });
    return `${ground('#6E9FAE')}${m}`;
  }
  function river() { return waterRipples('#4E8FB0', '#BFE0F0'); }
  function canal(r, c) {
    return `${ground('#C9C2B4')}<rect x="0" y="16" width="64" height="32" fill="#4E8FB0"/>
      <path d="M0 16h64M0 48h64" stroke="#8A8F8F" stroke-width="3"/>
      <path d="M${-8 + (c % 2) * 6} 32q6-3 12 0t12 0t12 0t12 0t12 0t12 0" stroke="#BFE0F0" stroke-width="1.6" fill="none" opacity=".6"/>`;
  }

  const DRAW = { H: homes, A: apartments, M: market, S: school, W: wetland, E: empty, P: park, O: pond, G: mangrove, R: river, C: canal };

  function overlays(cell, g) {
    let o = '';
    if (cell.drain) o += `<g><rect x="45" y="45" width="15" height="15" rx="2" fill="#2B3A44"/><path d="M48 48v9M51.5 48v9M55 48v9" stroke="#9BB0BB" stroke-width="1.6"/></g>`;
    if (cell.dike) {
      const sides = [];
      if (cell.c > 0 && g.grid[cell.r][cell.c - 1].type === 'R') sides.push('<rect x="0" y="0" width="9" height="64" fill="#7C8A8F"/><rect x="0" y="0" width="9" height="64" fill="url(#hatch)"/>');
      if (cell.r > 0 && g.grid[cell.r - 1][cell.c].type === 'R') sides.push('<rect x="0" y="0" width="64" height="9" fill="#7C8A8F"/>');
      if (cell.r < ROWS - 1 && g.grid[cell.r + 1][cell.c].type === 'R') sides.push('<rect x="0" y="55" width="64" height="9" fill="#7C8A8F"/>');
      o += sides.join('');
    }
    if (cell.gate) o += `<g><rect x="0" y="12" width="14" height="40" fill="#58616A"/><rect x="2" y="18" width="10" height="28" fill="#F2C230"/><path d="M2 22h10M2 28h10M2 34h10M2 40h10" stroke="#58616A" stroke-width="1.5"/></g>`;
    for (let i = 0; i < cell.raised; i++) o += `<path d="M${5 + i * 10} 61l4-5 4 5" stroke="#1D4B97" stroke-width="2.4" fill="none"/>`;
    return o;
  }

  function tile(cell, g) {
    const body = (DRAW[cell.type] || empty)(cell.r, cell.c);
    return `<svg viewBox="0 0 64 64" aria-hidden="true" preserveAspectRatio="none">${body}${overlays(cell, g)}</svg>`;
  }

  // small icon for the tool tray / legend
  const ICON = {
    inspect: '<circle cx="27" cy="27" r="14" fill="none" stroke="currentColor" stroke-width="5"/><path d="M38 38l14 14" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>',
    drain: '<rect x="12" y="12" width="40" height="40" rx="4" fill="currentColor"/><path d="M22 18v28M32 18v28M42 18v28" stroke="var(--icon-bg,#fff)" stroke-width="4"/>',
    park: '<circle cx="24" cy="26" r="13" fill="currentColor"/><circle cx="42" cy="34" r="11" fill="currentColor" opacity=".7"/><path d="M24 38v16" stroke="currentColor" stroke-width="5"/>',
    pond: '<rect x="8" y="14" width="48" height="36" rx="16" fill="currentColor"/><path d="M18 32q5-4 10 0t10 0t10 0" stroke="var(--icon-bg,#fff)" stroke-width="3" fill="none"/>',
    mangrove: '<circle cx="32" cy="22" r="14" fill="currentColor"/><path d="M32 30v20M32 36l-12 16M32 36l12 16" stroke="currentColor" stroke-width="4"/>',
    dike: '<path d="M6 50l12-30h28l12 30z" fill="currentColor"/><path d="M6 56q8-5 16 0t16 0t16 0" stroke="currentColor" stroke-width="4" fill="none" opacity=".6"/>',
    gate: '<rect x="10" y="10" width="10" height="44" fill="currentColor"/><rect x="44" y="10" width="10" height="44" fill="currentColor"/><rect x="20" y="20" width="24" height="26" fill="currentColor" opacity=".55"/>',
    raise: '<path d="M14 36l18-18 18 18" stroke="currentColor" stroke-width="6" fill="none"/><path d="M14 52l18-18 18 18" stroke="currentColor" stroke-width="6" fill="none" opacity=".55"/>',
    develop: '<rect x="14" y="8" width="20" height="48" fill="currentColor"/><rect x="36" y="22" width="16" height="34" fill="currentColor" opacity=".6"/>',
  };
  const icon = id => `<svg viewBox="0 0 64 64" aria-hidden="true" class="ico">${ICON[id] || ''}</svg>`;

  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v6" stroke="#5F6C70" stroke-width="2"/></pattern></defs></svg>`;

  return { tile, icon, DEFS };
})();
