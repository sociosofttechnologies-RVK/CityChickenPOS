// Sample product pictures: simple drawings used until the shop uploads its own photo.
// A product with its own image (Products tab > Change) never uses these.
const PINK = '#F3A69C', PINK_D = '#C96A66', RED = '#A81C28', RED_D = '#6E0C14', BONE = '#FFF8E6', BONE_D = '#D9C9A0';

const wrap = (inner) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180"><rect width="240" height="180" fill="#FFF3A0"/>` +
      `<ellipse cx="120" cy="150" rx="88" ry="12" fill="#E9D75A"/>${inner}</svg>`
  );

const chunk = (x, y, w, h, rot, fill, stroke) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h * 0.38}" transform="rotate(${rot} ${x + w / 2} ${y + h / 2})" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;

function chunks(fill, stroke) {
  return (
    chunk(52, 86, 62, 44, -12, fill, stroke) +
    chunk(128, 92, 60, 42, 14, fill, stroke) +
    chunk(88, 48, 64, 44, 6, fill, stroke) +
    chunk(98, 104, 52, 36, -4, fill, stroke) +
    `<circle cx="112" cy="66" r="7" fill="${BONE}" stroke="${BONE_D}" stroke-width="2"/>` +
    `<circle cx="160" cy="112" r="6" fill="${BONE}" stroke="${BONE_D}" stroke-width="2"/>`
  );
}

const ART = {
  chickenCuts: () => chunks(PINK, PINK_D),
  muttonCuts: () => chunks(RED, RED_D) + `<path d="M64 100 q14 -8 30 0 M140 106 q14 -6 28 2" fill="none" stroke="#F6D9D2" stroke-width="4" stroke-linecap="round"/>`,
  dressedBird: () =>
    `<ellipse cx="112" cy="96" rx="64" ry="42" fill="${PINK}" stroke="${PINK_D}" stroke-width="3"/>` +
    `<ellipse cx="176" cy="76" rx="26" ry="15" transform="rotate(-28 176 76)" fill="${PINK}" stroke="${PINK_D}" stroke-width="3"/>` +
    `<ellipse cx="180" cy="116" rx="26" ry="15" transform="rotate(24 180 116)" fill="${PINK}" stroke="${PINK_D}" stroke-width="3"/>` +
    `<ellipse cx="92" cy="70" rx="26" ry="11" transform="rotate(-14 92 70)" fill="#F7BBB2" stroke="${PINK_D}" stroke-width="3"/>` +
    `<path d="M70 104 q40 22 84 4" fill="none" stroke="${PINK_D}" stroke-width="3" stroke-linecap="round"/>`,
  fillet: () =>
    `<path d="M52 100 C52 48 148 36 188 72 C212 94 184 142 130 144 C86 146 52 136 52 100Z" fill="${PINK}" stroke="${PINK_D}" stroke-width="3"/>` +
    `<path d="M76 96 C96 66 150 60 176 84" fill="none" stroke="#F9CFC7" stroke-width="6" stroke-linecap="round"/>`,
  drumstick: () =>
    `<path d="M146 112 L190 146" stroke="${BONE}" stroke-width="16" stroke-linecap="round"/>` +
    `<path d="M146 112 L190 146" stroke="${BONE_D}" stroke-width="2" fill="none"/>` +
    `<circle cx="186" cy="152" r="10" fill="${BONE}" stroke="${BONE_D}" stroke-width="2"/><circle cx="197" cy="141" r="10" fill="${BONE}" stroke="${BONE_D}" stroke-width="2"/>` +
    `<ellipse cx="100" cy="82" rx="60" ry="44" transform="rotate(34 100 82)" fill="${PINK}" stroke="${PINK_D}" stroke-width="3"/>` +
    `<path d="M66 66 q22 -18 52 -6" fill="none" stroke="#F9CFC7" stroke-width="6" stroke-linecap="round"/>`,
  liver: () =>
    `<ellipse cx="150" cy="100" rx="46" ry="32" transform="rotate(18 150 100)" fill="#6B1F22" stroke="#3F0E11" stroke-width="3"/>` +
    `<ellipse cx="96" cy="92" rx="56" ry="38" transform="rotate(-14 96 92)" fill="#7E2529" stroke="#3F0E11" stroke-width="3"/>` +
    `<path d="M62 84 q24 -22 58 -12" fill="none" stroke="#A8484B" stroke-width="6" stroke-linecap="round"/>`,
  steak: () =>
    `<path d="M48 96 C44 52 120 34 172 54 C208 68 206 128 162 142 C112 158 52 142 48 96Z" fill="${RED}" stroke="${RED_D}" stroke-width="3"/>` +
    `<path d="M74 92 q30 -24 62 -6 M104 118 q30 10 60 -14 M92 70 q20 -8 40 -2" fill="none" stroke="#F3D3CC" stroke-width="4" stroke-linecap="round"/>`,
  hen: () =>
    `<path d="M168 92 L206 52 L200 104 Z" fill="#5E2F10"/>` +
    `<ellipse cx="128" cy="100" rx="56" ry="38" fill="#8B4A1E" stroke="#5E2F10" stroke-width="3"/>` +
    `<path d="M108 100 q24 22 54 0" fill="none" stroke="#5E2F10" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="72" cy="60" r="12" fill="#B3121F"/><circle cx="84" cy="52" r="10" fill="#B3121F"/>` +
    `<circle cx="80" cy="74" r="22" fill="#8B4A1E" stroke="#5E2F10" stroke-width="3"/>` +
    `<path d="M58 74 L40 80 L58 86 Z" fill="#E9A400"/><circle cx="74" cy="70" r="3.5" fill="#1B0A04"/>` +
    `<ellipse cx="66" cy="96" rx="6" ry="10" fill="#B3121F"/>` +
    `<path d="M118 136 v16 M142 136 v16" stroke="#E9A400" stroke-width="5" stroke-linecap="round"/>`,
  eggs: (fill, stroke) =>
    `<ellipse cx="84" cy="100" rx="30" ry="40" transform="rotate(-10 84 100)" fill="${fill}" stroke="${stroke}" stroke-width="3"/>` +
    `<ellipse cx="156" cy="102" rx="30" ry="40" transform="rotate(12 156 102)" fill="${fill}" stroke="${stroke}" stroke-width="3"/>` +
    `<ellipse cx="120" cy="84" rx="30" ry="40" fill="${fill}" stroke="${stroke}" stroke-width="3"/>` +
    `<path d="M104 66 q8 -14 20 -12" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".7"/>`,
  fish: () =>
    `<path d="M178 96 L214 66 L208 126 Z" fill="#6E8FA0" stroke="#3F5B69" stroke-width="3"/>` +
    `<ellipse cx="112" cy="96" rx="72" ry="34" fill="#9FB9C6" stroke="#3F5B69" stroke-width="3"/>` +
    `<circle cx="66" cy="88" r="5" fill="#1B2A31"/><path d="M92 74 q8 22 0 44" fill="none" stroke="#3F5B69" stroke-width="3"/>`,
  wings: () =>
    `<path d="M48 112 C40 78 84 58 118 80 C140 58 186 66 192 96 C176 108 154 100 138 110 C112 134 66 134 48 112Z" fill="${PINK}" stroke="${PINK_D}" stroke-width="3"/>` +
    `<path d="M118 80 q8 16 20 30 M70 94 q20 -14 40 -4" fill="none" stroke="${PINK_D}" stroke-width="3" stroke-linecap="round"/>`,
  mince: (fill, stroke) =>
    [[86, 108, 26], [120, 92, 30], [154, 108, 26], [104, 122, 22], [138, 124, 22]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`).join('') +
    `<path d="M100 92 q10 -10 20 0 t20 0 M84 112 q8 -8 16 0 M132 116 q8 -8 16 0" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`,
  chops: () =>
    `<path d="M150 74 L198 40" stroke="${BONE}" stroke-width="15" stroke-linecap="round"/><path d="M150 74 L198 40" stroke="${BONE_D}" stroke-width="2"/>` +
    `<path d="M50 104 C46 66 104 50 148 64 C176 74 176 124 142 138 C104 152 54 140 50 104Z" fill="#F6E3D6" stroke="${RED_D}" stroke-width="3"/>` +
    `<path d="M64 104 C62 78 104 66 138 76 C158 84 156 116 134 126 C104 136 66 128 64 104Z" fill="${RED}"/>` +
    `<path d="M82 98 q22 -16 46 -4" fill="none" stroke="#F3D3CC" stroke-width="4" stroke-linecap="round"/>`,
  bones: () =>
    [[58, 74, 170, 62], [70, 122, 182, 110]].map(([x1, y1, x2, y2]) =>
      `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${BONE_D}" stroke-width="22" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${BONE}" stroke-width="17" stroke-linecap="round"/>` +
      `<circle cx="${x1 - 6}" cy="${y1 - 9}" r="11" fill="${BONE}" stroke="${BONE_D}" stroke-width="2.5"/><circle cx="${x1 - 6}" cy="${y1 + 10}" r="11" fill="${BONE}" stroke="${BONE_D}" stroke-width="2.5"/>` +
      `<circle cx="${x2 + 8}" cy="${y2}" r="13" fill="#E9B7A6" stroke="${PINK_D}" stroke-width="2.5"/>`).join(''),
  prawn: () =>
    `<path d="M176 132 L204 122 L196 150 Z" fill="#E8744F"/>` +
    `<path d="M66 118 C56 70 118 42 164 70 C192 88 186 124 172 134" fill="none" stroke="#B8492A" stroke-width="32" stroke-linecap="round"/>` +
    `<path d="M66 118 C56 70 118 42 164 70 C192 88 186 124 172 134" fill="none" stroke="#F4906C" stroke-width="26" stroke-linecap="round"/>` +
    `<path d="M84 74 l12 22 M112 60 l6 24 M142 62 l-4 24 M166 80 l-16 16" stroke="#B8492A" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="64" cy="112" r="4" fill="#1B0A04"/><path d="M58 126 q-18 4 -24 -12 M64 130 q-14 14 -30 6" fill="none" stroke="#B8492A" stroke-width="2.5" stroke-linecap="round"/>`,
  crab: () =>
    `<path d="M76 96 L52 78 M164 96 L188 78 M78 112 L44 122 M162 112 L196 122 M84 124 L58 144 M156 124 L182 144" stroke="#A8391A" stroke-width="7" stroke-linecap="round"/>` +
    `<circle cx="50" cy="66" r="17" fill="#E2572B" stroke="#A8391A" stroke-width="3"/><circle cx="190" cy="66" r="17" fill="#E2572B" stroke="#A8391A" stroke-width="3"/>` +
    `<ellipse cx="120" cy="104" rx="52" ry="34" fill="#E2572B" stroke="#A8391A" stroke-width="3"/>` +
    `<circle cx="104" cy="74" r="6" fill="#1B0A04"/><circle cx="136" cy="74" r="6" fill="#1B0A04"/><path d="M98 108 q22 14 44 0" fill="none" stroke="#A8391A" stroke-width="3" stroke-linecap="round"/>`,
  fishSteak: () =>
    [[86, 104, -8], [156, 96, 10]].map(([x, y, r]) =>
      `<ellipse cx="${x}" cy="${y}" rx="42" ry="34" transform="rotate(${r} ${x} ${y})" fill="#8FA9B6" stroke="#3F5B69" stroke-width="3"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="33" ry="26" transform="rotate(${r} ${x} ${y})" fill="#F7DCD0"/>` +
      `<circle cx="${x}" cy="${y}" r="6" fill="${BONE}" stroke="${BONE_D}" stroke-width="2"/><path d="M${x - 24} ${y} h14 M${x + 10} ${y} h14 M${x} ${y - 20} v10 M${x} ${y + 10} v10" stroke="#E3B7A8" stroke-width="3" stroke-linecap="round"/>`).join(''),
  quailEggs: () =>
    [[78, 112, -14], [114, 92, 6], [150, 112, 16], [186, 98, -6]].map(([x, y, r]) =>
      `<ellipse cx="${x}" cy="${y}" rx="18" ry="24" transform="rotate(${r} ${x} ${y})" fill="#F3E7C8" stroke="#A88F5C" stroke-width="2.5"/>` +
      `<circle cx="${x - 6}" cy="${y - 8}" r="3.5" fill="#6B4A22"/><circle cx="${x + 6}" cy="${y + 2}" r="4.5" fill="#6B4A22"/><circle cx="${x - 3}" cy="${y + 11}" r="3" fill="#6B4A22"/><circle cx="${x + 5}" cy="${y - 13}" r="2.5" fill="#6B4A22"/>`).join(''),
};

const cache = {};
export function sampleImage(p) {
  const s = (p.name + ' ' + p.type).toLowerCase();
  const mutton = /mutton|goat|lamb/.test(s);
  let key;
  if (/egg/.test(s)) key = /quail|kaadai/.test(s) ? 'quailEggs' : /nattu|country|brown/.test(s) ? 'eggsBrown' : 'eggsWhite';
  else if (/prawn|shrimp|eral/.test(s)) key = 'prawn';
  else if (/crab|nandu/.test(s)) key = 'crab';
  else if (/steak|vanjaram|seer|slice/.test(s) && !mutton) key = 'fishSteak';
  else if (/fish|seafood|pomfret|sardine|mathi|vavval|rohu/.test(s)) key = 'fish';
  else if (/liver|gizzard/.test(s)) key = 'liver';
  else if (/keema|mince/.test(s)) key = mutton ? 'minceRed' : 'mincePink';
  else if (/paya|trotter/.test(s)) key = 'bones';
  else if (/chop|rib/.test(s)) key = 'chops';
  else if (/wing/.test(s)) key = 'wings';
  else if (/drumstick|leg|lollipop/.test(s)) key = 'drumstick';
  else if (/boneless|breast|fillet|cube/.test(s)) key = mutton ? 'steak' : /cube/.test(s) ? 'chickenCuts' : 'fillet';
  else if (mutton) key = 'muttonCuts';
  else if (/nattu|country|quail|kaadai/.test(s)) key = 'hen';
  else if (/skinless|whole|with skin/.test(s)) key = 'dressedBird';
  else if (/chicken/.test(s)) key = 'chickenCuts';
  else return '';
  if (!cache[key]) {
    const art =
      key === 'eggsWhite' ? ART.eggs('#FFFDF4', '#CFC39A')
      : key === 'eggsBrown' ? ART.eggs('#C98F5A', '#8C5A2E')
      : key === 'mincePink' ? ART.mince(PINK, PINK_D)
      : key === 'minceRed' ? ART.mince(RED, RED_D)
      : ART[key]();
    cache[key] = wrap(art);
  }
  return cache[key];
}
