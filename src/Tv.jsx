import React, { useState, useEffect, useRef, useMemo } from 'react';
import { inr, unitLabel, loadFile, readProducts, readConfig, SEED_PRODUCTS, SEED_CONFIG, slug, folderImages, loadFolderImages } from './lib.js';
import { sampleImage } from './samples.js';
import logo from './assets/logo.jpg';
import './tv.css';

const PER_PAGE = 8; // photo cards on one menu slide (two rows of four)
const picture = (p) => p.img || folderImages[slug(p.name)] || sampleImage(p);
const seconds = (v, fallback) => Math.min(120, Math.max(1, +v || fallback)) * 1000;

export function enterFullscreen(el) {
  const go = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (go) Promise.resolve(go.call(el)).catch(() => {});
}

/* Each letter drops in one after another. */
function Letters({ text, step = 45 }) {
  let n = 0;
  return (
    <span className="tv-letters" aria-label={text}>
      {text.split(' ').map((word, w) => (
        <React.Fragment key={w}>
          {w > 0 && ' '}
          <span className="tv-word" aria-hidden="true">
            {[...word].map((ch) => { const k = n++; return <span key={k} style={{ animationDelay: k * step + 'ms' }}>{ch}</span>; })}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

/* The running order: video, offer 1, the whole menu, offer 2, the whole menu again, and so on. */
function buildSteps(products, media, tv) {
  const types = [];
  for (const p of products.filter((x) => x.available)) {
    let t = types.find((x) => x.type === p.type);
    if (!t) types.push((t = { type: p.type, items: [] }));
    t.items.push(p);
  }
  const menu = [];
  for (const t of types) {
    const pages = Math.ceil(t.items.length / PER_PAGE);
    const size = Math.ceil(t.items.length / pages); // 12 items become 6 + 6, not 8 + 4
    for (let n = 0; n < pages; n++) {
      menu.push({ kind: 'menu', type: t.type, items: t.items.slice(n * size, (n + 1) * size), page: n + 1, pages, ms: seconds(tv.menuSeconds, 3) });
    }
  }
  const steps = [media.video ? { kind: 'video', url: media.video.url, ms: seconds(tv.videoSeconds, 10) } : { kind: 'intro', ms: 4000 }];
  if (media.offers.length === 0) steps.push(...menu);
  for (const o of media.offers) steps.push({ kind: 'offer', url: o.url, ms: seconds(tv.offerSeconds, 3) }, ...menu);
  return steps;
}

function MenuSlide({ step, shop, background }) {
  const n = step.items.length;
  const cols = n <= 4 ? n : n <= 6 ? 3 : 4;
  // Behind the cards: the uploaded background photo, or else this type's own first photo, blurred and darkened.
  const behind = background || picture(step.items[0]);
  return (
    <div className="tv-slide tv-menu">
      {behind && <div className={'tv-backdrop' + (background ? ' own' : '')} style={{ backgroundImage: `url("${behind}")` }} />}
      <div className="tv-bar">
        <img src={logo} alt="" />
        <b>{shop.name}</b>
        <span>{shop.address}</span>
      </div>
      <div className="tv-title">
        <h2><Letters text={step.type} /></h2>
        <i />
        {step.pages > 1 && <em>{step.page} / {step.pages}</em>}
      </div>
      <div className={'tv-cards c' + cols + (n <= 4 ? ' tall' : '')}>
        {step.items.map((p, k) => {
          const src = picture(p);
          return (
            <div className="tv-card" key={p.id} style={{ animationDelay: 200 + k * 90 + 'ms' }}>
              <div className="tv-ph">
                {src ? <img src={src} alt="" /> : <span>{p.name.charAt(0)}</span>}
                <div className="tv-tag" style={{ animationDelay: 550 + k * 90 + 'ms' }}>{inr(p.price).replace('.00', '')}<small>/{unitLabel(p.unit)}</small></div>
              </div>
              <div className="tv-cap"><b>{p.name}</b>{p.desc && <small>{p.desc}</small>}</div>
            </div>
          );
        })}
      </div>
      <div className="tv-foot">Bloody Fresh · cut to order · prices are for today</div>
    </div>
  );
}

function Slide({ step, shop, background, onBroken }) {
  if (step.kind === 'video') return <div className="tv-slide tv-video"><video src={step.url} autoPlay muted loop playsInline onError={onBroken} /></div>;
  if (step.kind === 'offer') {
    return (
      <div className="tv-slide tv-offer">
        <div className="tv-blur" style={{ backgroundImage: `url("${step.url}")` }} />
        <img src={step.url} alt="Offer" onError={onBroken} />
      </div>
    );
  }
  if (step.kind === 'intro') {
    return (
      <div className="tv-slide tv-intro">
        <img src={logo} alt="" />
        <h1><Letters text={shop.name} step={55} /></h1>
        <p>{shop.address}</p>
      </div>
    );
  }
  return <MenuSlide step={step} shop={shop} background={background} />;
}

/* The player. In the till it gets the live products and settings; on the TV it loads them itself and refreshes every round. */
export function TvScreen({ products: liveProducts, config: liveConfig, media: liveMedia, standalone, restart = 0 }) {
  const [polled, setMedia] = useState({ version: '', offers: [], video: null, background: null });
  const media = liveMedia || polled; // the till passes its own list, so an upload shows in the preview at once
  const [own, setOwn] = useState(null);
  const [i, setI] = useState(0);
  const [round, setRound] = useState(0);
  const [scale, setScale] = useState(1);
  const [hint, setHint] = useState(true);
  const wrap = useRef(null);

  // New uploads appear on the TV within a few seconds, without touching the TV.
  useEffect(() => {
    let live = true;
    const tick = () => fetch('/api/tv').then((r) => r.json()).then((m) => live && setMedia((old) => (old.version === m.version ? old : m))).catch(() => {});
    tick();
    const id = setInterval(tick, 4000);
    return () => { live = false; clearInterval(id); };
  }, []);

  // On the TV: read products and prices at the start of every round, so price changes show up.
  useEffect(() => {
    if (liveProducts) return;
    let live = true;
    Promise.all([loadFile('products.xml'), loadFile('config.xml'), loadFolderImages()])
      .then(([p, c]) => live && setOwn({ products: p ? readProducts(p) : SEED_PRODUCTS, config: c ? readConfig(c) : {} }))
      .catch(() => {});
    return () => { live = false; };
  }, [round, liveProducts]);

  const products = liveProducts || (own && own.products) || [];
  const cfg = liveConfig || (own && own.config) || {};
  const shop = { ...SEED_CONFIG.shop, ...cfg.shop };
  const tv = { ...SEED_CONFIG.tv, ...cfg.tv };
  const steps = useMemo(() => buildSteps(products, media, tv), [products, media, tv.videoSeconds, tv.offerSeconds, tv.menuSeconds]);
  const step = steps[i % steps.length];
  const next = () => setI((n) => { const m = (n + 1) % steps.length; if (m === 0) setRound((r) => r + 1); return m; });

  useEffect(() => { setI(0); }, [restart]);
  useEffect(() => {
    const t = setTimeout(next, step.ms);
    return () => clearTimeout(t);
  }, [i, steps]);

  // The slides are drawn at 1280 x 720 and scaled to whatever screen they are on.
  useEffect(() => {
    const fit = () => wrap.current && setScale(Math.min(wrap.current.clientWidth / 1280, wrap.current.clientHeight / 720));
    fit();
    window.addEventListener('resize', fit);
    document.addEventListener('fullscreenchange', fit);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(wrap.current);
    return () => { window.removeEventListener('resize', fit); document.removeEventListener('fullscreenchange', fit); if (ro) ro.disconnect(); };
  }, []);

  // On the TV: show the Full screen button for a few seconds, and again whenever the remote is used.
  useEffect(() => {
    if (!standalone) return;
    let t = setTimeout(() => setHint(false), 9000);
    const wake = () => { setHint(true); clearTimeout(t); t = setTimeout(() => setHint(false), 6000); };
    window.addEventListener('mousemove', wake);
    window.addEventListener('keydown', wake);
    return () => { clearTimeout(t); window.removeEventListener('mousemove', wake); window.removeEventListener('keydown', wake); };
  }, [standalone]);

  return (
    <div className={'tv-wrap' + (standalone ? ' standalone' : '')} ref={wrap}>
      <div className="tv-stage" style={{ transform: `translate(-50%,-50%) scale(${scale})` }}>
        {products.length > 0 && <Slide key={round + '-' + i + '-' + step.kind} step={step} shop={shop} background={media.background && media.background.url} onBroken={next} />}
      </div>
      {standalone && hint && (
        <button className="tv-full" autoFocus onClick={() => { enterFullscreen(document.documentElement); setHint(false); }}>Full screen (press OK)</button>
      )}
    </div>
  );
}

/* ---------- the "TV Preview" tab in the till ---------- */
function Field({ label, id, ...props }) {
  return <label className="f" htmlFor={id}><span>{label}</span><input id={id} {...props} /></label>;
}

export function TvAdmin({ products, config, setConfig }) {
  const [media, setMedia] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [restart, setRestart] = useState(0);
  const box = useRef(null);
  const tv = { ...SEED_CONFIG.tv, ...config.tv };

  const refresh = () => fetch('/api/tv').then((r) => r.json()).then(setMedia).catch(() => setMsg('Could not read the TV files. Is server.js running?'));
  useEffect(() => { refresh(); }, []);

  async function upload(kind, files) {
    setMsg('');
    for (const file of files) {
      setBusy('Uploading ' + file.name + '…');
      try {
        const r = await fetch('/api/tv/upload?kind=' + kind + '&name=' + encodeURIComponent(file.name), { method: 'POST', body: file });
        if (!r.ok) throw new Error(await r.text());
        setMedia(await r.json());
      } catch (e) {
        setMsg(file.name + ': ' + e.message);
      }
    }
    setBusy('');
  }
  async function remove(kind, name = '') {
    const r = await fetch('/api/tv/media?kind=' + kind + '&name=' + encodeURIComponent(name), { method: 'DELETE' });
    if (r.ok) setMedia(await r.json());
  }
  const pick = (kind) => (e) => { const files = [...e.target.files]; e.target.value = ''; if (files.length) upload(kind, files); };
  const setTv = (k) => (e) => setConfig((c) => ({ ...c, tv: { ...SEED_CONFIG.tv, ...c.tv, [k]: e.target.value } }));
  const types = [...new Set(products.filter((p) => p.available).map((p) => p.type))];

  return (
    <div className="till">
      <div className="col">
        <div className="panel">
          <div className="head">
            <h2>TV preview</h2>
            <div className="btns">
              <button className="btn" onClick={() => setRestart((n) => n + 1)}>Restart</button>
              <button className="btn pri" onClick={() => enterFullscreen(box.current)}>Maximize</button>
            </div>
          </div>
          <div className="tv-box" ref={box}>
            <TvScreen products={products} config={config} media={media || undefined} restart={restart} />
          </div>
          <p className="small muted" style={{ margin: '10px 0 0' }}>
            Running order: video, {media && media.offers.length ? 'offer 1, ' : ''}menu ({types.join(', ')}){media && media.offers.length > 1 ? ', offer 2, menu again' : ''}, then it repeats. Press Esc to leave full screen.
          </p>
        </div>

        <div className="panel">
          <div className="head"><h2>Show it on the TV</h2></div>
          {media && media.addresses.length ? (
            <>
              <p style={{ margin: '0 0 8px' }}>The TV must be on the same Wi-Fi as this computer. In the TV's browser, type:</p>
              {media.addresses.map((a) => <div key={a} className="tv-address num">{a}</div>)}
              <p className="small muted" style={{ margin: '10px 0 0' }}>Then choose "Add to home screen" or "Bookmark" in the TV browser's menu to get an icon for next time. The TV can only view: it cannot change prices or see bills.</p>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>This computer is not connected to a network, so the TV cannot reach it yet.</p>
          )}
        </div>
      </div>

      <div className="col">
        <div className="panel">
          <div className="head">
            <h2>Offer slides</h2>
            <span className="btn pri filebtn">Upload offers<input id="tv-offers" type="file" accept="image/*" multiple aria-label="Upload offer images" onChange={pick('offer')} /></span>
          </div>
          {media && media.offers.length === 0 && <div className="empty">No offer images yet. Upload one or more; they appear on the TV within a few seconds.</div>}
          <div className="tv-thumbs">
            {media && media.offers.map((o, k) => (
              <div key={o.name} className="tv-thumb">
                <img src={o.url} alt={'Offer ' + (k + 1)} />
                <div><b>Offer {k + 1}</b><button className="btn danger" onClick={() => remove('offer', o.name)}>Remove</button></div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="head">
            <h2>Opening video</h2>
            <div className="btns">
              {media && media.video && <button className="btn danger" onClick={() => remove('video')}>Remove</button>}
              <span className="btn pri filebtn">{media && media.video ? 'Replace video' : 'Upload video'}<input id="tv-video" type="file" accept="video/mp4,video/webm" aria-label="Upload video" onChange={pick('video')} /></span>
            </div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>{media && media.video ? 'A video is set. It plays without sound for the time below.' : 'No video yet, so the shop name is shown for 4 seconds. Use an MP4 file; it plays without sound.'}</p>
        </div>

        <div className="panel">
          <div className="head">
            <h2>Menu background</h2>
            <div className="btns">
              {media && media.background && <button className="btn danger" onClick={() => remove('background')}>Remove</button>}
              <span className="btn pri filebtn">{media && media.background ? 'Replace photo' : 'Upload photo'}<input id="tv-bg" type="file" accept="image/*" aria-label="Upload menu background" onChange={pick('background')} /></span>
            </div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>{media && media.background ? 'Your photo is behind the menu, darkened so the prices stay readable.' : 'Optional. A photo of fresh meat shows behind the menu list. Without one, a deep red marbled background is used.'}</p>
        </div>

        <div className="panel">
          <div className="head"><h2>Timings (seconds)</h2></div>
          <div className="form">
            <Field label="Video" id="tv-videoSeconds" type="number" min={1} max={120} value={tv.videoSeconds} onChange={setTv('videoSeconds')} />
            <Field label="Each offer slide" id="tv-offerSeconds" type="number" min={1} max={60} value={tv.offerSeconds} onChange={setTv('offerSeconds')} />
            <Field label="Each menu slide" id="tv-menuSeconds" type="number" min={1} max={60} value={tv.menuSeconds} onChange={setTv('menuSeconds')} />
          </div>
        </div>
        {busy && <div className="note">{busy}</div>}
        {msg && <div className="note">{msg}</div>}
      </div>
    </div>
  );
}
