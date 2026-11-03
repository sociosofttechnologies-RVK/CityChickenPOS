/* ---------- small helpers ---------- */
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const uid = () => 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
export const unitLabel = (u) => (u === 'kg' ? 'kg' : 'pc');
export const qtyText = (q, u) => (u === 'kg' ? Number(q).toFixed(3) + ' kg' : q + ' pc');

/* ---------- XML files (through server.js): products and settings in src/data, daily bills in transactions ---------- */
export async function loadFile(name) {
  const r = await fetch('/api/data/' + name);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Read failed (' + r.status + ')');
  return r.text();
}
export async function listFiles() {
  const r = await fetch('/api/data');
  if (!r.ok) throw new Error('List failed (' + r.status + ')');
  return r.json();
}
export async function saveFile(name, xml) {
  const r = await fetch('/api/data/' + name, { method: 'PUT', headers: { 'Content-Type': 'application/xml' }, body: xml });
  if (!r.ok) throw new Error('Save failed (' + r.status + ')');
}

/* ---------- real product photos dropped into the product-images folder ---------- */
// "Chicken curry cut" -> "chicken-curry-cut", which matches a file named chicken-curry-cut.jpg
export const slug = (name) => String(name).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const folderImages = {};
export async function loadFolderImages() {
  try {
    const r = await fetch('/api/images');
    if (!r.ok) return;
    for (const k of Object.keys(folderImages)) delete folderImages[k];
    for (const f of await r.json()) folderImages[f.replace(/\.[^.]+$/, '').toLowerCase()] = '/product-images/' + encodeURIComponent(f);
  } catch (e) {
    /* no photo folder: the drawings are used */
  }
}

/* ---------- writing XML ---------- */
export function productsXML(list) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<products>\n' +
    list
      .map(
        (p) =>
          `  <product id="${esc(p.id)}" type="${esc(p.type)}" unit="${esc(p.unit)}" price="${Number(p.price).toFixed(2)}" available="${!!p.available}">\n` +
          `    <name>${esc(p.name)}</name>\n    <description>${esc(p.desc || '')}</description>\n    <image>${esc(p.img || '')}</image>\n  </product>`
      )
      .join('\n') +
    '\n</products>\n'
  );
}
export function configXML(c) {
  const a = (o) => Object.entries(o).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <shop ${a(c.shop)}/>\n  <printer ${a(c.printer)}/>\n  <scale ${a(c.scale)}/>\n  <tv ${a(c.tv || {})}/>\n</config>\n`;
}
export function billsXML(date, bills) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<bills date="${date}">\n` +
    bills
      .map(
        (b) =>
          `  <bill no="${esc(b.no)}" time="${esc(b.time)}" payment="${esc(b.pay)}" subtotal="${b.sub.toFixed(2)}" roundOff="${b.round.toFixed(2)}" total="${b.total.toFixed(2)}">\n` +
          b.items.map((i) => `    <item name="${esc(i.name)}" unit="${i.unit}" qty="${i.qty}" rate="${i.rate.toFixed(2)}" amount="${i.amount.toFixed(2)}"/>`).join('\n') +
          '\n  </bill>'
      )
      .join('\n') +
    (bills.length ? '\n' : '') +
    '</bills>\n'
  );
}

/* ---------- reading XML ---------- */
const parse = (x) => new DOMParser().parseFromString(x, 'application/xml');
const attrs = (el) => (el ? Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])) : {});
export function readProducts(x) {
  return [...parse(x).querySelectorAll('product')].map((p) => ({
    id: p.getAttribute('id'),
    type: p.getAttribute('type'),
    unit: p.getAttribute('unit'),
    price: +p.getAttribute('price'),
    available: p.getAttribute('available') === 'true',
    name: p.querySelector('name')?.textContent || '',
    desc: p.querySelector('description')?.textContent || '',
    img: p.querySelector('image')?.textContent || '',
  }));
}
export function readConfig(x) {
  const d = parse(x);
  return { shop: attrs(d.querySelector('shop')), printer: attrs(d.querySelector('printer')), scale: attrs(d.querySelector('scale')), tv: attrs(d.querySelector('tv')) };
}
export function readBills(x) {
  return [...parse(x).querySelectorAll('bill')].map((b) => ({
    no: b.getAttribute('no'),
    time: b.getAttribute('time'),
    pay: b.getAttribute('payment'),
    sub: +b.getAttribute('subtotal'),
    round: +b.getAttribute('roundOff'),
    total: +b.getAttribute('total'),
    items: [...b.querySelectorAll('item')].map((i) => ({
      name: i.getAttribute('name'),
      unit: i.getAttribute('unit'),
      qty: +i.getAttribute('qty'),
      rate: +i.getAttribute('rate'),
      amount: +i.getAttribute('amount'),
    })),
  }));
}

/* ---------- starting data, used only when an XML file does not exist yet ---------- */
// [name, type, sold by, price, short description]. Ids p1, p2... follow this order, so add new lines at the end.
export const SEED_PRODUCTS = [
  ['Chicken curry cut', 'Chicken', 'kg', 240, 'Skinless, bone-in pieces for curry'],
  ['Chicken skinless', 'Chicken', 'kg', 260, 'Whole bird, skin removed'],
  ['Chicken boneless breast', 'Chicken', 'kg', 340, 'Lean fillets, no bone'],
  ['Chicken drumstick', 'Chicken', 'kg', 300, 'Juicy leg pieces, bone-in'],
  ['Chicken liver', 'Chicken', 'kg', 160, 'Cleaned, ready to fry'],
  ['Nattu kozhi (country chicken)', 'Country chicken', 'kg', 520, 'Free-range bird, firm meat'],
  ['Mutton curry cut', 'Mutton', 'kg', 880, 'Mixed bone-in pieces for kuzhambu'],
  ['Mutton boneless', 'Mutton', 'kg', 1100, 'Tender leg meat, no bone'],
  ['Eggs (white)', 'Eggs', 'pc', 7, 'Farm eggs, sold per piece'],
  ['Nattu eggs', 'Eggs', 'pc', 14, 'Country chicken eggs'],
  ['Chicken with skin', 'Chicken', 'kg', 220, 'Whole bird, skin on'],
  ['Chicken boneless cubes', 'Chicken', 'kg', 320, 'Bite-size pieces for fry and 65'],
  ['Chicken wings', 'Chicken', 'kg', 230, 'Whole wings with tip'],
  ['Chicken lollipop', 'Chicken', 'kg', 280, 'Frenched wing pieces for starters'],
  ['Chicken whole leg', 'Chicken', 'kg', 290, 'Thigh and drumstick together'],
  ['Chicken keema (mince)', 'Chicken', 'kg', 330, 'Freshly minced boneless meat'],
  ['Chicken gizzard', 'Chicken', 'kg', 150, 'Cleaned and trimmed'],
  ['Mutton chops', 'Mutton', 'kg', 920, 'Rib chops for fry and grill'],
  ['Mutton keema (mince)', 'Mutton', 'kg', 950, 'Freshly minced, lean'],
  ['Mutton liver', 'Mutton', 'kg', 760, 'Fresh liver, cleaned'],
  ['Mutton ribs', 'Mutton', 'kg', 860, 'Bone-in ribs for soup and fry'],
  ['Mutton paya (trotters)', 'Mutton', 'pc', 60, 'Cleaned legs, sold per piece'],
  ['Kaadai (quail)', 'Quail', 'pc', 70, 'Dressed whole bird, per piece'],
  ['Kaadai eggs (quail eggs)', 'Eggs', 'pc', 4, 'Small speckled eggs'],
  ['Vanjaram (seer fish) steaks', 'Fish & seafood', 'kg', 1400, 'Thick steaks for fry'],
  ['Vavval (pomfret)', 'Fish & seafood', 'kg', 900, 'Whole fish, cleaned'],
  ['Mathi (sardine)', 'Fish & seafood', 'kg', 220, 'Whole, cleaned'],
  ['Rohu curry cut', 'Fish & seafood', 'kg', 320, 'Bone-in slices for kuzhambu'],
  ['Prawns (cleaned)', 'Fish & seafood', 'kg', 650, 'Peeled and deveined'],
  ['Crab', 'Fish & seafood', 'kg', 480, 'Whole sea crab, cleaned'],
].map(([name, type, unit, price, desc], i) => ({ id: 'p' + (i + 1), name, type, unit, price, desc, available: true, img: '' }));

export const SEED_CONFIG = {
  shop: { name: 'City Chicken Mutton Center', address: '46, Padmavathy Nagar, Madambakkam, Main Road, Chennai 600126', phone: '', gstin: '', catalog: '2' },
  printer: { name: 'TVS RP 3200 Lite', paperWidth: '80', copies: '1', footer: 'Thank you. Fresh cut daily.' },
  scale: { model: 'HMS-C', capacityKg: '30', divisionG: '5', minimumG: '100', baudRate: '9600', dataBits: '8', parity: 'none', sends: 'kg', demo: 'false' },
  tv: { videoSeconds: '10', offerSeconds: '3', menuSeconds: '3' },
};

/* ---------- product photo -> small JPEG stored inside products.xml ---------- */
export function fileToThumb(file, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = 240;
      c.height = 180;
      const s = Math.max(240 / im.width, 180 / im.height);
      const w = im.width * s;
      const h = im.height * s;
      c.getContext('2d').drawImage(im, (240 - w) / 2, (180 - h) / 2, w, h);
      cb(c.toDataURL('image/jpeg', 0.72));
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}
