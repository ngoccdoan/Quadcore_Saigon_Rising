/* Saigon Rising — static game data: map, tiles, tools, facts.
   Plain script (no modules) so index.html works when opened straight from disk. */

const COLS = 10, ROWS = 7;
const START_YEAR = 2026, YEAR_STEP = 2, TOTAL_ROUNDS = 12;   // 2026 → 2050
const FLOOD_DEPTH = 0.15;          // metres of water at which a block counts as flooded
const RAIN_CONCENTRATION = 3;      // street runoff piles up: 100 mm of rain ≈ 0.3 m on concrete
const SUBSIDENCE = 0.04;           // land sinking per round (2 years) while groundwater is pumped
const SUBSIDENCE_POLICY = 0.008;   // after the clean-water policy
const START_BUDGET = 160;          // ₫ billions
const START_HAPPINESS = 70;

// R river · C canal · H homes · A apartments · M market · S school · W wetland · E empty lot
const MAP_ROWS = [
  'RREHHEWWHE',
  'REHHMHEWHH',
  'RHHEHSHEEH',
  'RCCCCCCCCE',
  'RWHHEHHMHH',
  'RWWEHHEHHE',
  'RRWEHEWHEH',
];
const CANAL_MOUTH = { r: 3, c: 1 };

const TILE = {
  R: { name: 'Saigon River', vi: 'Sông Sài Gòn', runoff: 0, people: 0, income: 0 },
  C: { name: 'Canal', vi: 'Kênh rạch', runoff: 0, people: 0, income: 0 },
  H: { name: 'Homes', vi: 'Nhà ở', runoff: 0.85, people: 1, income: 5 },
  A: { name: 'Apartments', vi: 'Chung cư', runoff: 0.95, people: 2, income: 10 },
  M: { name: 'Market', vi: 'Chợ', runoff: 0.9, people: 0, income: 12 },
  S: { name: 'School', vi: 'Trường học', runoff: 0.8, people: 1, income: 0 },
  W: { name: 'Wetland', vi: 'Đất ngập nước', runoff: 0.15, people: 0, income: 0 },
  E: { name: 'Empty lot', vi: 'Đất trống', runoff: 0.6, people: 0, income: 0 },
  P: { name: 'Rain park', vi: 'Công viên thấm', runoff: 0.25, people: 0, income: 0 },
  O: { name: 'Retention pond', vi: 'Hồ điều tiết', runoff: 1, people: 0, income: 0 },
  G: { name: 'Mangroves', vi: 'Rừng ngập mặn', runoff: 0.2, people: 0, income: 0 },
};
const POND_DEPTH = 0.9;        // a retention pond can hold this much extra water
const MANGROVE_BUFFER = 0.35;  // mangroves add this much protection against tides
const DIKE_HEIGHT = 1.0;
const RAISE_STEP = 0.4;

const TOOLS = [
  { id: 'inspect', key: '1', name: 'Inspect', cost: 0, desc: 'Look at a block: height above the river, what it is, how deep it flooded.' },
  { id: 'drain', key: '2', name: 'Drains', cost: 22, desc: 'Bigger street drains. Pull water off this block and its neighbours — but they can only empty into the canal when the tide is low.' },
  { id: 'park', key: '3', name: 'Rain park', cost: 18, desc: 'Turn an empty lot into a park that soaks up rain instead of shedding it.' },
  { id: 'pond', key: '4', name: 'Retention pond', cost: 40, desc: 'Dig a pond on an empty lot or wetland. It stores a lot of water from the surrounding blocks.' },
  { id: 'mangrove', key: '5', name: 'Mangroves', cost: 20, desc: 'Plant mangroves on a riverbank lot or wetland. They slow the tide before it reaches the streets.' },
  { id: 'dike', key: '6', name: 'River dike', cost: 45, desc: 'Wall a riverbank block against the tide. Careful: a wall also traps rainwater behind it.' },
  { id: 'gate', key: '7', name: 'Tide gate + pump', cost: 70, desc: 'Only at the canal mouth. Stops the tide pushing up the canal and pumps the canal out, so drains work even at high tide.' },
  { id: 'raise', key: '8', name: 'Raise buildings', cost: 28, desc: 'Lift homes, the market or the school by 40 cm (up to twice).' },
  { id: 'develop', key: '9', name: 'Sell to developer', cost: -35, desc: 'Get ₫35 billion now and more tax later by building apartments on an empty lot or wetland. Concrete sheds almost all its rain.' },
];

const POLICY = { id: 'water', name: 'Clean piped water', cost: 90,
  desc: 'Supply piped river water so homes stop pumping groundwater. The land stops sinking.' };

// Short, general facts about flooding in Hồ Chí Minh City (see project report for sources).
const FACTS = {
  intro: 'Hồ Chí Minh City is built on low, flat land beside the Saigon River. Nearly half of the city sits less than one metre above sea level.',
  kingTide: 'Triều cường — king tides — peak towards the end of the year. When a king tide meets heavy rain, water has nowhere to go.',
  drainBlocked: 'Street drains empty into canals and the river. At high tide the outlets are underwater, so drains back up — that is why the city builds tidal sluice gates on its canals.',
  subsidence: 'Pumping groundwater makes the land sink. Researchers estimate the city sinks about 2–5 cm a year on average — more than twice as fast as the sea is rising.',
  concrete: 'Fast urban growth has paved over fields, ponds and wetlands that once soaked up rain. Concrete sends almost all of it straight onto the streets.',
  mangrove: 'The Cần Giờ mangrove forest south-east of the city is a UNESCO Biosphere Reserve. Mangroves slow tides and waves and protect the coast.',
  sponge: '"Sponge city" design uses parks, ponds and permeable ground to store rainwater and release it slowly instead of flooding streets.',
  people: 'Floodwater at a high tide can reach knee height in some streets. It stalls motorbike commutes, damages homes and small shops, and hits low-lying neighbourhoods hardest.',
  storm: 'The rainy season runs roughly from May to November. One intense storm can drop more rain in a few hours than the drains were built to carry.',
  climate: 'Rising seas and heavier downpours mean flood planning has to look decades ahead, not just to next season.',
  dikeTrap: 'Walls keep the river out but also keep rain in. Without drains or pumps behind them, walled neighbourhoods can fill up like a bathtub.',
};

if (typeof module !== 'undefined') module.exports = {
  COLS, ROWS, START_YEAR, YEAR_STEP, TOTAL_ROUNDS, FLOOD_DEPTH, RAIN_CONCENTRATION, SUBSIDENCE,
  SUBSIDENCE_POLICY, START_BUDGET, START_HAPPINESS, MAP_ROWS, CANAL_MOUTH, TILE, POND_DEPTH,
  MANGROVE_BUFFER, DIKE_HEIGHT, RAISE_STEP, TOOLS, POLICY, FACTS };
