// City Chicken POS local service. No packages needed: run with "node server.js".
// 1. Serves the built app from ./dist (the till at /, the TV screen at /tv)
// 2. Reads and writes products.xml and config.xml in ./src/data
// 3. Reads and writes the daily bill files (bills-YYYY-MM-DD.xml) in ./transactions
// 4. Serves real product photos from ./product-images (file name = product name)
// 5. Stores the TV video, offer slides and menu background in ./tv-media
//
// Other devices on the same Wi-Fi (the TV) may only VIEW: they can load the TV screen,
// products and pictures. Only this computer can change anything or read the bills.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(ROOT, 'src', 'data');
const TX = path.join(ROOT, 'transactions');
const IMAGES = path.join(ROOT, 'product-images');
const TV = path.join(ROOT, 'tv-media');
const OFFERS = path.join(TV, 'offers');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 4310;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const SAFE_NAME = /^[A-Za-z0-9_-]+\.xml$/;
const IMAGE_NAME = /^[A-Za-z0-9 ._-]+\.(jpe?g|png|webp|gif)$/i;
const VIDEO_NAME = /^[A-Za-z0-9 ._-]+\.(mp4|webm)$/i;
const MAX_UPLOAD = { offer: 20, background: 20, video: 500 }; // megabytes

for (const dir of [DATA, TX, IMAGES, TV, OFFERS]) fs.mkdirSync(dir, { recursive: true });
const folderFor = (name) => (name.startsWith('bills-') ? TX : DATA);
const listXml = (dir) => fs.readdirSync(dir).filter((f) => SAFE_NAME.test(f));
// Bills saved by the earlier version in src/data are moved to the transactions folder once.
for (const f of listXml(DATA).filter((n) => n.startsWith('bills-'))) {
  if (!fs.existsSync(path.join(TX, f))) fs.renameSync(path.join(DATA, f), path.join(TX, f));
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

// Sends a file, honouring Range requests so videos can start and loop on TVs.
function sendFile(req, res, file) {
  const stat = fs.statSync(file);
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) {
    let start = m[1] ? parseInt(m[1], 10) : stat.size - parseInt(m[2], 10);
    let end = m[1] && m[2] ? parseInt(m[2], 10) : stat.size - 1;
    start = Math.max(0, start);
    end = Math.min(end, stat.size - 1);
    if (start > end) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size });
      return res.end();
    }
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store' });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': stat.size, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

const isThisComputer = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
const lanAddresses = () =>
  Object.values(os.networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => 'http://' + n.address + ':' + PORT + '/tv');

// What the TV should show right now. "version" changes whenever a file is added, replaced or removed.
function tvState() {
  const info = (dir, f) => {
    const st = fs.statSync(path.join(dir, f));
    return f + ':' + st.size + ':' + Math.round(st.mtimeMs);
  };
  const offers = fs.readdirSync(OFFERS).filter((f) => IMAGE_NAME.test(f)).sort();
  const top = fs.readdirSync(TV);
  const video = top.find((f) => /^video\.(mp4|webm)$/i.test(f)) || null;
  const background = top.find((f) => /^background\.(jpe?g|png|webp)$/i.test(f)) || null;
  const version = [...offers.map((f) => info(OFFERS, f)), video && info(TV, video), background && info(TV, background)].filter(Boolean).join('|');
  const q = (f, dir) => '?v=' + Math.round(fs.statSync(path.join(dir, f)).mtimeMs);
  return {
    version,
    offers: offers.map((f) => ({ name: f, url: '/tv-media/offers/' + encodeURIComponent(f) + q(f, OFFERS) })),
    video: video && { name: video, url: '/tv-media/' + video + q(video, TV) },
    background: background && { name: background, url: '/tv-media/' + background + q(background, TV) },
    addresses: lanAddresses(),
  };
}

const removeMatching = (dir, re) => fs.readdirSync(dir).filter((f) => re.test(f)).forEach((f) => fs.unlinkSync(path.join(dir, f)));

function handleUpload(req, res, url) {
  const kind = url.searchParams.get('kind');
  const original = path.basename(url.searchParams.get('name') || '').replace(/[^A-Za-z0-9 ._-]/g, '_');
  const ext = path.extname(original).toLowerCase();
  let target;
  if (kind === 'offer' && IMAGE_NAME.test(original)) target = path.join(OFFERS, Date.now() + '-' + original);
  else if (kind === 'background' && /\.(jpe?g|png|webp)$/.test(ext)) target = path.join(TV, 'background' + ext);
  else if (kind === 'video' && VIDEO_NAME.test(original)) target = path.join(TV, 'video' + ext);
  else return send(res, 400, kind === 'video' ? 'Use an .mp4 or .webm video.' : 'Use a .jpg, .png or .webp image.');

  const limit = MAX_UPLOAD[kind] * 1024 * 1024;
  if (Number(req.headers['content-length'] || 0) > limit) return send(res, 413, 'File is larger than ' + MAX_UPLOAD[kind] + ' MB.');
  const tmp = path.join(TV, '.upload-' + Date.now());
  const out = fs.createWriteStream(tmp);
  let size = 0;
  let failed = false;
  req.on('data', (c) => {
    size += c.length;
    if (size > limit && !failed) {
      failed = true;
      req.unpipe(out);
      out.destroy();
      fs.rm(tmp, { force: true }, () => {});
      send(res, 413, 'File is larger than ' + MAX_UPLOAD[kind] + ' MB.');
    }
  });
  req.pipe(out);
  out.on('finish', () => {
    if (failed) return;
    try {
      if (kind === 'video') removeMatching(TV, /^video\.(mp4|webm)$/i);
      if (kind === 'background') removeMatching(TV, /^background\.(jpe?g|png|webp)$/i);
      fs.renameSync(tmp, target);
      send(res, 200, JSON.stringify(tvState()), 'application/json');
    } catch (e) {
      send(res, 500, 'Could not save the file: ' + e.message);
    }
  });
  out.on('error', (e) => !failed && send(res, 500, 'Could not save the file: ' + e.message));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  // The TV and any other device on the Wi-Fi: view only, and never the bills.
  if (!isThisComputer(req)) {
    const viewing = (req.method === 'GET' || req.method === 'HEAD') && p !== '/api/data' && !p.startsWith('/api/data/bills-');
    if (!viewing) return send(res, 403, 'This device can only view the TV screen.');
    if (p === '/') {
      res.writeHead(302, { Location: '/tv' });
      return res.end();
    }
  }

  // ---- TV media ----
  if (p === '/api/tv' && req.method === 'GET') return send(res, 200, JSON.stringify(tvState()), 'application/json');
  if (p === '/api/tv/upload' && req.method === 'POST') return handleUpload(req, res, url);
  if (p === '/api/tv/media' && req.method === 'DELETE') {
    const kind = url.searchParams.get('kind');
    const name = path.basename(url.searchParams.get('name') || '');
    if (kind === 'video') removeMatching(TV, /^video\.(mp4|webm)$/i);
    else if (kind === 'background') removeMatching(TV, /^background\.(jpe?g|png|webp)$/i);
    else if (kind === 'offer' && IMAGE_NAME.test(name) && fs.existsSync(path.join(OFFERS, name))) fs.unlinkSync(path.join(OFFERS, name));
    else return send(res, 400, 'Nothing to remove');
    return send(res, 200, JSON.stringify(tvState()), 'application/json');
  }
  if (p.startsWith('/tv-media/')) {
    const rel = decodeURIComponent(p.slice('/tv-media/'.length));
    const name = path.basename(rel);
    const file = rel.startsWith('offers/') ? path.join(OFFERS, name) : path.join(TV, name);
    if (!(IMAGE_NAME.test(name) || VIDEO_NAME.test(name)) || !fs.existsSync(file)) return send(res, 404, 'Not found');
    return sendFile(req, res, file);
  }

  // ---- product photos ----
  if (p === '/api/images') {
    return send(res, 200, JSON.stringify(fs.readdirSync(IMAGES).filter((f) => IMAGE_NAME.test(f))), 'application/json');
  }
  if (p.startsWith('/product-images/')) {
    const name = decodeURIComponent(p.slice('/product-images/'.length));
    const file = path.join(IMAGES, name);
    if (!IMAGE_NAME.test(name) || !fs.existsSync(file)) return send(res, 404, 'Not found');
    return sendFile(req, res, file);
  }

  // ---- XML data ----
  if (p === '/api/data') {
    return send(res, 200, JSON.stringify([...listXml(DATA), ...listXml(TX)].sort()), 'application/json');
  }
  if (p.startsWith('/api/data/')) {
    const name = decodeURIComponent(p.slice('/api/data/'.length));
    if (!SAFE_NAME.test(name)) return send(res, 400, 'Bad file name');
    const file = path.join(folderFor(name), name);

    if (req.method === 'GET') {
      if (!fs.existsSync(file)) return send(res, 404, 'Not found');
      return send(res, 200, fs.readFileSync(file), 'application/xml; charset=utf-8');
    }
    if (req.method === 'PUT') {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > 50 * 1024 * 1024) req.destroy();
        else chunks.push(c);
      });
      req.on('end', () => {
        try {
          // Write to a temporary file first so a power cut cannot leave a half-written XML file.
          const tmp = file + '.tmp';
          fs.writeFileSync(tmp, Buffer.concat(chunks));
          fs.renameSync(tmp, file);
          send(res, 200, 'Saved');
        } catch (e) {
          send(res, 500, 'Could not save: ' + e.message);
        }
      });
      return;
    }
    return send(res, 405, 'Method not allowed');
  }

  // ---- the built app (the till, and the TV screen at /tv) ----
  const rel = p === '/' ? 'index.html' : p.slice(1);
  let file = path.normalize(path.join(DIST, rel));
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) return send(res, 500, 'App is not built yet. Run: npm install && npm run build');
  sendFile(req, res, file);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.log('City Chicken POS is already running on this computer. This window can be closed.');
  else console.log('Could not start: ' + e.message);
  process.exit(0);
});

// Listens on the Wi-Fi as well, so the TV can open the TV screen. Windows asks once to allow this.
server.listen(PORT, '0.0.0.0', () => {
  console.log('City Chicken POS till:  http://localhost:' + PORT);
  for (const a of lanAddresses()) console.log('TV screen, type this in the TV browser:  ' + a);
  console.log('Products and settings: ' + DATA);
  console.log('Daily bills: ' + TX);
  console.log('TV video and offers: ' + TV);
});
