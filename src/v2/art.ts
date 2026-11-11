import { NODES, PLACES, ROADS, WORLD, type Point } from './places';

/*
 * The town's picture, drawn here as one SVG in the map's units (./places.ts WORLD): the meadow, the hills along the top,
 * a stream, the roads (from ./places.ts ROADS, so the runner walks on what's drawn), the square and its fountain, the trees
 * and each place's building, its door at its road's end. Everything is the site's own drawing; it can be swapped for a
 * painted map later by replacing this file's output with an <img> of the same size.
 */

const svgPoint = (p: Point): string => `${p.x},${p.y}`;

/** A tree at (x, y) (its foot), `s` times the usual size, in one of three greens. */
function tree(x: number, y: number, s = 1, tone = 0): string {
  const leaf = ['#2f6b35', '#3b7a3c', '#28592f'][tone % 3];
  const light = ['#4a8f47', '#58a052', '#3d7a3f'][tone % 3];
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="4" rx="34" ry="10" fill="#000" opacity=".18"/>
    <rect x="-6" y="-34" width="12" height="38" rx="3" fill="#5b3f2a"/>
    <circle cx="0" cy="-62" r="36" fill="${leaf}"/>
    <circle cx="-20" cy="-44" r="24" fill="${leaf}"/>
    <circle cx="20" cy="-46" r="25" fill="${leaf}"/>
    <circle cx="-8" cy="-74" r="18" fill="${light}" opacity=".7"/>
  </g>`;
}

/** A bush at (x, y). */
const bush = (x: number, y: number, s = 1): string =>
  `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="3" rx="26" ry="7" fill="#000" opacity=".15"/><circle cx="-12" cy="-8" r="14" fill="#3b7a3c"/><circle cx="10" cy="-10" r="16" fill="#2f6b35"/><circle cx="0" cy="-16" r="12" fill="#4a8f47"/></g>`;

/** A lamp post at (x, y). */
const lamp = (x: number, y: number): string =>
  `<g transform="translate(${x} ${y})" class="v2-lamp"><ellipse cx="0" cy="2" rx="12" ry="4" fill="#000" opacity=".2"/><rect x="-3" y="-70" width="6" height="72" fill="#2c2a30"/><rect x="-10" y="-86" width="20" height="18" rx="4" fill="#2c2a30"/><rect x="-7" y="-83" width="14" height="12" rx="2" fill="#ffd37a" class="v2-glow"/></g>`;

/** A barrel and a crate, by a door. */
const goods = (x: number, y: number): string =>
  `<g transform="translate(${x} ${y})"><rect x="-22" y="-30" width="30" height="30" fill="#8a6038" stroke="#5a3d22" stroke-width="3"/><path d="M-22 -15h30M-7 -30v30" stroke="#5a3d22" stroke-width="2"/><ellipse cx="26" cy="-2" rx="14" ry="5" fill="#000" opacity=".2"/><rect x="13" y="-34" width="26" height="34" rx="9" fill="#9a6a3c"/><path d="M13 -24h26M13 -10h26" stroke="#4e3420" stroke-width="3"/></g>`;

/** Shadow under a building, `w` wide. */
const shadow = (w: number): string => `<ellipse cx="0" cy="6" rx="${w / 2 + 30}" ry="34" fill="#000" opacity=".22"/>`;

// The buildings: each drawn with its door's foot at (0, 0).

const forge = (): string => `
  ${shadow(300)}
  <rect x="-150" y="-190" width="300" height="190" fill="#6f6862"/>
  <path d="M-150 -150h300M-150 -110h300M-150 -70h300M-150 -30h300" stroke="#5c5651" stroke-width="3"/>
  <path d="M-110 -190v40M-30 -190v40M50 -190v40M-70 -150v40M10 -150v40M90 -150v40M-110 -110v40M-30 -110v40M50 -110v40M110 -110v40M-70 -70v40M10 -70v40M90 -70v40" stroke="#5c5651" stroke-width="3"/>
  <polygon points="-175,-185 0,-290 175,-185" fill="#3a3f4a"/>
  <polygon points="-175,-185 0,-290 0,-185" fill="#454b57"/>
  <rect x="70" y="-330" width="44" height="110" fill="#5c5651"/>
  <rect x="64" y="-340" width="56" height="18" fill="#4a4541"/>
  <g class="v2-smoke"><circle cx="92" cy="-360" r="16"/><circle cx="100" cy="-360" r="12"/><circle cx="86" cy="-360" r="10"/></g>
  <path d="M-38 0v-90a38 38 0 0 1 76 0v90z" fill="#2a1a12"/>
  <path d="M-30 0v-86a30 30 0 0 1 60 0v86z" fill="#ff8a3d" class="v2-glow"/>
  <rect x="-120" y="-150" width="46" height="40" fill="#ffb366" class="v2-glow"/>
  <rect x="74" y="-150" width="46" height="40" fill="#ffb366" class="v2-glow"/>
  <path d="M-120 -130h46M-97 -150v40M74 -130h46M97 -150v40" stroke="#5c5651" stroke-width="4"/>
  <g transform="translate(-110 0)"><rect x="-26" y="-34" width="52" height="14" rx="4" fill="#2b2b30"/><rect x="-10" y="-20" width="20" height="20" fill="#2b2b30"/><rect x="-20" y="-4" width="40" height="6" fill="#2b2b30"/></g>`;

const casino = (): string => `
  ${shadow(380)}
  <rect x="-190" y="-170" width="380" height="170" fill="#4b2d5e"/>
  <rect x="-190" y="-178" width="380" height="16" fill="#d8bf7a"/>
  <path d="M-130 -178a130 120 0 0 1 260 0z" fill="#5d3a74"/>
  <path d="M-130 -178a130 120 0 0 1 260 0" fill="none" stroke="#d8bf7a" stroke-width="8"/>
  <rect x="-6" y="-330" width="12" height="40" fill="#d8bf7a"/><circle cx="0" cy="-336" r="12" fill="#ffe28a" class="v2-glow"/>
  <rect x="-110" y="-250" width="220" height="44" rx="10" fill="#21142b" stroke="#d8bf7a" stroke-width="4"/>
  <text x="0" y="-219" text-anchor="middle" font-size="30" font-weight="700" fill="#ffe28a" class="v2-glow" letter-spacing="6">CASINO</text>
  <g fill="#ffd96b" class="v2-glow"><rect x="-160" y="-130" width="40" height="56" rx="20"/><rect x="-100" y="-130" width="40" height="56" rx="20"/><rect x="60" y="-130" width="40" height="56" rx="20"/><rect x="120" y="-130" width="40" height="56" rx="20"/></g>
  <path d="M-46 0v-104h92v104z" fill="#2a1834"/>
  <path d="M-38 0v-96h76v96z" fill="#b8434d"/>
  <path d="M0 0v-96" stroke="#2a1834" stroke-width="4"/>
  <g class="v2-suits" font-size="26" font-weight="700" text-anchor="middle"><text x="-140" y="-36" fill="#ffe28a">♠</text><text x="-90" y="-36" fill="#ff6b6b">♥</text><text x="90" y="-36" fill="#ff6b6b">♦</text><text x="140" y="-36" fill="#ffe28a">♣</text></g>`;

const databank = (): string => `
  ${shadow(200)}
  <rect x="-160" y="-120" width="320" height="120" fill="#5f6b80"/>
  <polygon points="-175,-118 0,-170 175,-118" fill="#2f5d66"/>
  <rect x="-80" y="-380" width="160" height="300" fill="#6c7a91"/>
  <path d="M-80 -320h160M-80 -260h160M-80 -200h160M-80 -140h160" stroke="#5f6b80" stroke-width="3"/>
  <polygon points="-100,-376 0,-500 100,-376" fill="#2f6f78"/>
  <polygon points="0,-500 100,-376 0,-376" fill="#285e66"/>
  <circle cx="0" cy="-300" r="40" fill="#1d2433"/>
  <circle cx="0" cy="-300" r="32" fill="#7fd6ff" class="v2-glow"/>
  <path d="M0 -326v52M-26 -300h52M-18 -318l36 36M18 -318l-36 36" stroke="#1d6b8e" stroke-width="4"/>
  <rect x="-130" y="-90" width="34" height="50" rx="17" fill="#9ad8ff" class="v2-glow"/>
  <rect x="96" y="-90" width="34" height="50" rx="17" fill="#9ad8ff" class="v2-glow"/>
  <rect x="-60" y="-200" width="30" height="44" rx="15" fill="#9ad8ff" class="v2-glow"/>
  <rect x="30" y="-200" width="30" height="44" rx="15" fill="#9ad8ff" class="v2-glow"/>
  <path d="M-40 0v-80a40 40 0 0 1 80 0v80z" fill="#1d2433"/>
  <path d="M-32 0v-76a32 32 0 0 1 64 0v76z" fill="#36506e"/>`;

const shop = (): string => `
  ${shadow(320)}
  <rect x="-160" y="-200" width="320" height="200" fill="#c9b08a"/>
  <path d="M-160 -200h320" stroke="#7a5a3a" stroke-width="10"/>
  <path d="M-160 -200v200M160 -200v200M-50 -200v200M50 -200v200" stroke="#7a5a3a" stroke-width="8"/>
  <polygon points="-190,-196 0,-300 190,-196" fill="#9c3d3f"/>
  <polygon points="0,-300 190,-196 0,-196" fill="#873436"/>
  <g transform="translate(0 -140)"><path d="M-180 0h360l-20 50h-320z" fill="#efe3bf"/><path d="M-150 0l-20 50h40l10-50zM-70 0l-10 50h40l0-50zM10 0l0 50h40l-10-50zM90 0l10 50h40l-20-50z" fill="#b94a4c"/></g>
  <rect x="-140" y="-80" width="70" height="60" fill="#ffd37a" class="v2-glow"/>
  <rect x="70" y="-80" width="70" height="60" fill="#ffd37a" class="v2-glow"/>
  <path d="M-36 0v-86h72v86z" fill="#5a3d22"/>
  <circle cx="22" cy="-42" r="5" fill="#d8bf7a"/>
  ${goods(-120, 0)}`;

const hall = (): string => `
  ${shadow(380)}
  <rect x="-200" y="-24" width="400" height="24" fill="#a8a29a"/>
  <rect x="-180" y="-200" width="360" height="176" fill="#d8d0c2"/>
  <polygon points="-210,-196 0,-300 210,-196" fill="#7a2e33"/>
  <polygon points="-170,-204 0,-284 170,-204" fill="#d8d0c2"/>
  <circle cx="0" cy="-236" r="22" fill="#d8bf7a"/>
  <path d="M0 -252l6 12h12l-10 8 4 13-12-8-12 8 4-13-10-8h12z" fill="#7a2e33"/>
  <g fill="#c4baa9"><rect x="-160" y="-196" width="26" height="172"/><rect x="-100" y="-196" width="26" height="172"/><rect x="74" y="-196" width="26" height="172"/><rect x="134" y="-196" width="26" height="172"/></g>
  <g fill="#b94a4c"><path d="M-128 -186h24v80l-12-12-12 12z"/><path d="M104 -186h24v80l-12-12-12 12z"/></g>
  <path d="M-46 -24v-110a46 46 0 0 1 92 0v110z" fill="#3a2a22"/>
  <path d="M-38 -24v-106a38 38 0 0 1 76 0v106z" fill="#ffcf7a" class="v2-glow"/>`;

const storehouse = (): string => `
  ${shadow(340)}
  <rect x="-170" y="-180" width="340" height="180" fill="#8b5a36"/>
  <path d="M-170 -150h340M-170 -120h340M-170 -90h340M-170 -60h340M-170 -30h340" stroke="#6e4528" stroke-width="3"/>
  <polygon points="-195,-176 0,-290 195,-176" fill="#5b3d2a"/>
  <polygon points="0,-290 195,-176 0,-176" fill="#4d3323"/>
  <rect x="-26" y="-250" width="52" height="40" fill="#2a1a12"/>
  <rect x="-20" y="-244" width="40" height="30" fill="#ffd37a" class="v2-glow"/>
  <path d="M-70 0v-130h140v130z" fill="#5a3a22"/>
  <path d="M-70 -130l140 130M70 -130l-140 130M0 -130v130" stroke="#3b2516" stroke-width="7"/>
  <path d="M-70 0v-130h140v130" fill="none" stroke="#e6d6b8" stroke-width="6"/>
  ${goods(130, 0)}${goods(-128, 0)}`;

const armory = (): string => `
  ${shadow(300)}
  <rect x="-150" y="-180" width="300" height="180" fill="#7d8088"/>
  <g fill="#6a6d75"><rect x="-150" y="-212" width="40" height="34"/><rect x="-80" y="-212" width="40" height="34"/><rect x="-10" y="-212" width="40" height="34"/><rect x="60" y="-212" width="40" height="34"/><rect x="110" y="-212" width="40" height="34"/></g>
  <rect x="-60" y="-320" width="120" height="140" fill="#878a92"/>
  <g fill="#767981"><rect x="-60" y="-346" width="30" height="28"/><rect x="-15" y="-346" width="30" height="28"/><rect x="30" y="-346" width="30" height="28"/></g>
  <path d="M0 -300l40 14v34c0 28-20 44-40 52-20-8-40-24-40-52v-34z" fill="#2f4f86" stroke="#d8bf7a" stroke-width="5"/>
  <path d="M-16 -268l32 32M16 -268l-32 32" stroke="#d8d0c2" stroke-width="6" stroke-linecap="round"/>
  <rect x="-120" y="-120" width="34" height="50" rx="4" fill="#ffd37a" class="v2-glow"/>
  <rect x="86" y="-120" width="34" height="50" rx="4" fill="#ffd37a" class="v2-glow"/>
  <path d="M-40 0v-100a40 40 0 0 1 80 0v100z" fill="#2a2a30"/>
  <path d="M-32 0v-96a32 32 0 0 1 64 0v96z" fill="#4a4d55"/>
  <path d="M-32 -60h64M-32 -30h64" stroke="#2a2a30" stroke-width="4"/>`;

/** Buildings drawn smaller than they're drawn above (the databank's tower would reach past the map's top). */
export const SCALES: Readonly<Record<string, number>> = { databank: 0.8 };

const BUILDINGS: Readonly<Record<string, () => string>> = { forge, casino, databank, shop, heroes: hall, inventory: storehouse, player: armory };

/** The town as one SVG (its size: WORLD). */
export function townSvg(): string {
  const roadLines = ROADS.map(([a, b]) => `M${svgPoint(NODES[a] as Point)}L${svgPoint(NODES[b] as Point)}`).join('');
  const square = { x: ((NODES.west as Point).x + (NODES.east as Point).x) / 2, y: (NODES.west as Point).y };
  const trees = [
    [80, 330], [190, 420], [120, 560], [260, 300], [60, 760], [210, 860], [110, 980], [330, 1240], [520, 1310], [760, 1290],
    [980, 1250], [1380, 1250], [1600, 1300], [1980, 1290], [2140, 1180], [2300, 1050], [2340, 860], [2200, 760], [2320, 600],
    [2240, 420], [2340, 300], [2100, 330], [960, 360], [1440, 360], [300, 900], [1000, 1100], [1400, 1110], [2200, 920],
    [330, 470], [1930, 1180],
  ]
    .map(([x, y], i) => tree(x as number, y as number, 0.8 + ((i * 37) % 7) / 14, i))
    .join('');
  const bushes = [
    [950, 640], [1450, 640], [950, 850], [1450, 850], [700, 760], [1700, 760], [1090, 470], [1310, 470], [420, 720], [2010, 720],
  ]
    .map(([x, y]) => bush(x as number, y as number, 0.9))
    .join('');
  const lamps = [
    [1050, 650], [1350, 650], [1050, 840], [1350, 840], [700, 690], [1700, 690], [1260, 480], [1140, 980],
  ]
    .map(([x, y]) => lamp(x as number, y as number))
    .join('');
  // Each place's building behind its door, drawn from the top of the map down so the nearer ones are in front.
  const buildings = [...PLACES]
    .sort((a, b) => a.door.y - b.door.y)
    .map((place) => `<g class="v2-building" data-place="${place.id}" transform="translate(${place.door.x} ${place.door.y - 26}) scale(${SCALES[place.id] ?? 1})">${BUILDINGS[place.id]?.() ?? ''}</g>`)
    .join('');
  return `<svg class="v2-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WORLD.width} ${WORLD.height}" width="${WORLD.width}" height="${WORLD.height}" aria-hidden="true">
    <defs>
      <linearGradient id="v2-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f7d43"/><stop offset=".5" stop-color="#457339"/><stop offset="1" stop-color="#3a6331"/></linearGradient>
      <radialGradient id="v2-meadow"><stop offset="0" stop-color="#6b9a4f" stop-opacity=".55"/><stop offset="1" stop-color="#6b9a4f" stop-opacity="0"/></radialGradient>
      <radialGradient id="v2-plaza"><stop offset="0" stop-color="#cdb68d"/><stop offset="1" stop-color="#b39a70"/></radialGradient>
      <linearGradient id="v2-water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fb3d6"/><stop offset="1" stop-color="#3b84b0"/></linearGradient>
    </defs>
    <rect width="${WORLD.width}" height="${WORLD.height}" fill="url(#v2-grass)"/>
    <ellipse cx="600" cy="850" rx="380" ry="220" fill="url(#v2-meadow)"/>
    <ellipse cx="1800" cy="880" rx="420" ry="240" fill="url(#v2-meadow)"/>
    <ellipse cx="1200" cy="1180" rx="520" ry="160" fill="url(#v2-meadow)"/>
    <g class="v2-hills">
      <path d="M0 260 L0 0 L2400 0 L2400 250 C2250 170 2150 230 2020 160 C1880 90 1760 200 1620 140 C1480 80 1380 170 1220 120 C1080 70 960 180 820 130 C680 80 560 200 420 150 C280 100 160 220 0 260Z" fill="#53704a"/>
      <path d="M0 150 L180 30 L320 120 L470 10 L640 130 L800 40 L980 140 L1160 20 L1330 120 L1500 30 L1690 140 L1850 20 L2030 120 L2200 40 L2400 150 L2400 0 L0 0Z" fill="#6c7a86"/>
      <path d="M470 10 L420 50 L470 40 L510 60Z M1160 20 L1110 60 L1160 48 L1200 66Z M1850 20 L1800 60 L1850 48 L1890 64Z M800 40 L765 70 L805 62 L835 76Z M1500 30 L1462 64 L1502 56 L1534 70Z" fill="#e8ecef"/>
    </g>
    <path d="M0 1120 C120 1150 200 1210 260 1350 L360 1350 C300 1200 200 1110 0 1060Z" fill="url(#v2-water)"/>
    <path d="M30 1110 C130 1140 210 1200 260 1300" fill="none" stroke="#bfe6f5" stroke-width="5" stroke-dasharray="20 30" opacity=".6" class="v2-flow"/>
    <path d="${roadLines}" fill="none" stroke="#7a6448" stroke-width="78" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${roadLines}" fill="none" stroke="#b9a27a" stroke-width="62" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${roadLines}" fill="none" stroke="#a88f66" stroke-width="62" stroke-linecap="round" stroke-dasharray="2 22" opacity=".8"/>
    <circle cx="${square.x}" cy="${square.y}" r="168" fill="#7a6448"/>
    <circle cx="${square.x}" cy="${square.y}" r="158" fill="url(#v2-plaza)"/>
    <circle cx="${square.x}" cy="${square.y}" r="120" fill="none" stroke="#a88f66" stroke-width="6" stroke-dasharray="14 10"/>
    <g transform="translate(${square.x} ${square.y})">
      <ellipse cx="0" cy="8" rx="84" ry="40" fill="#000" opacity=".18"/>
      <ellipse cx="0" cy="0" rx="80" ry="40" fill="#8e8a84"/>
      <ellipse cx="0" cy="-6" rx="68" ry="32" fill="url(#v2-water)"/>
      <rect x="-10" y="-70" width="20" height="62" fill="#8e8a84"/>
      <ellipse cx="0" cy="-70" rx="28" ry="10" fill="#8e8a84"/>
      <ellipse cx="0" cy="-74" rx="20" ry="6" fill="#7fc8e8"/>
      <g class="v2-spray" fill="#cfefff"><circle cx="0" cy="-90" r="6"/><circle cx="-12" cy="-84" r="4"/><circle cx="12" cy="-84" r="4"/></g>
    </g>
    ${bushes}${trees}${lamps}${buildings}
  </svg>`;
}
