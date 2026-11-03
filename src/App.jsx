import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  inr, pad, dateKey, uid, unitLabel, qtyText, fileToThumb, loadFile, saveFile, listFiles,
  productsXML, configXML, billsXML, slug, folderImages, loadFolderImages, readProducts, readConfig, readBills, SEED_PRODUCTS, SEED_CONFIG,
} from './lib.js';
import { useScale } from './useScale.js';
import { sampleImage } from './samples.js';
import { TvAdmin } from './Tv.jsx';
import logo from './assets/logo.jpg';
import banner from './assets/banner.jpg';

/* ---------- small pieces ---------- */
function Pic({ p, cls = '' }) {
  // Order: photo uploaded in the Products tab, then a file in the product-images folder, then the drawing.
  const src = p.img || folderImages[slug(p.name)] || sampleImage(p);
  return src ? (
    <img className={'pic ' + cls} src={src} alt="" />
  ) : (
    <div className={'pic ' + cls} aria-hidden="true">{p.name.trim().charAt(0).toUpperCase()}</div>
  );
}

function Field({ label, id, children, ...props }) {
  return (
    <label className="f" htmlFor={id}>
      <span>{label}</span>
      {children || <input id={id} {...props} />}
    </label>
  );
}

function Receipt({ bill, config }) {
  const s = config.shop;
  const narrow = config.printer.paperWidth === '58';
  return (
    <div className="receipt" style={{ width: narrow ? '220px' : '302px', '--pw': narrow ? '48mm' : '72mm' }}>
      <img className="rlogo" src={logo} alt="" />
      <div className="c t">{s.name}</div>
      {s.address && <div className="c">{s.address}</div>}
      {s.phone && <div className="c">Ph: {s.phone}</div>}
      {s.gstin && <div className="c">GSTIN: {s.gstin}</div>}
      <hr />
      <div className="ln"><span>Bill {bill.no}</span><span>{bill.time}</span></div>
      <hr />
      {bill.items.map((i, k) => (
        <div key={k}>
          <div className="b">{i.name}</div>
          <div className="ln"><span>&nbsp;&nbsp;{qtyText(i.qty, i.unit)} x {i.rate.toFixed(2)}</span><span>{i.amount.toFixed(2)}</span></div>
        </div>
      ))}
      <hr />
      <div className="ln"><span>Subtotal</span><span>{bill.sub.toFixed(2)}</span></div>
      {bill.round !== 0 && <div className="ln"><span>Round off</span><span>{bill.round.toFixed(2)}</span></div>}
      <div className="ln gt"><span>TOTAL</span><span>{inr(bill.total)}</span></div>
      <div className="ln"><span>Paid by</span><span>{bill.pay}</span></div>
      <hr />
      <div className="c">{config.printer.footer}</div>
    </div>
  );
}

/* ---------- Billing ---------- */
function Billing({ products, config, scale, nextNo, saveBill, onPrint }) {
  const [type, setType] = useState('All');
  const [find, setFind] = useState('');
  const [sel, setSel] = useState(null);
  const [pcs, setPcs] = useState(6);
  const [cart, setCart] = useState([]);
  const [pay, setPay] = useState('Cash');
  const [done, setDone] = useState(null);
  const [manual, setManual] = useState('');
  const [preview, setPreview] = useState(null);

  const types = useMemo(() => ['All', ...new Set(products.map((p) => p.type))], [products]);
  const p = products.find((x) => x.id === sel);
  const byWeight = p && p.unit === 'kg';
  // With no scale connected the cashier types the weight; it is rounded to the scale's step and capped at its capacity.
  const step = (+config.scale.divisionG || 5) / 1000;
  const typedKg = Math.min(+config.scale.capacityKg || 30, Math.max(0, Math.round((+manual || 0) / step) * step));
  const manualMode = byWeight && !scale.live;
  const qty = p ? (byWeight ? +(scale.live ? Math.max(scale.net, 0) : typedKg).toFixed(3) : Math.max(1, Math.floor(+pcs || 0))) : 0;
  const amount = p ? Math.round(qty * p.price * 100) / 100 : 0;
  const minKg = (+config.scale.minimumG || 0) / 1000;
  const under = byWeight && qty < minKg;
  const canAdd = p && qty > 0 && (!byWeight || (!under && (manualMode || scale.stable)));
  const sub = cart.reduce((s, i) => s + i.amount, 0);
  const total = Math.round(sub);

  let addLabel = 'Add to bill';
  if (p) {
    if (manualMode && !qty) addLabel = 'Enter the weight';
    else if (under) addLabel = 'Below the ' + config.scale.minimumG + ' g minimum';
    else if (byWeight && !manualMode && !scale.stable) addLabel = 'Waiting for stable weight';
    else addLabel = 'Add to bill · ' + inr(amount);
  }

  function add() {
    setCart((c) => [...c, { name: p.name, unit: p.unit, qty, rate: p.price, amount }]);
    setSel(null);
    setDone(null);
    setPreview(null);
    setManual('');
  }
  // Step 1: build the bill and show it for checking. Nothing is saved or printed yet.
  function finish() {
    const d = new Date();
    const bill = {
      no: 'CC-' + dateKey(d).replace(/-/g, '') + '-' + String(nextNo).padStart(3, '0'),
      time: pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()),
      pay, sub, round: +(total - sub).toFixed(2), total, items: cart,
    };
    setPreview(bill);
  }
  // Step 2: the cashier confirms the preview. The bill is saved and sent to the printer.
  function confirmPrint() {
    saveBill(preview);
    onPrint(preview);
    setDone(preview);
    setPreview(null);
    setCart([]);
  }

  const scaleState = scale.connected ? 'connected' : scale.demo ? 'demo weight' : 'not connected · manual entry';

  return (
    <div className="till">
      <div className="panel">
        <div className="head">
          <h2>Pick a product</h2>
          <input id="find" className="find" type="search" placeholder="Search products" aria-label="Search products" value={find} onChange={(e) => setFind(e.target.value)} />
          <div className="chips">
            {types.map((t) => (
              <button key={t} className="chip" aria-pressed={type === t} onClick={() => setType(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="grid">
          {products.filter((x) => (type === 'All' || x.type === type) && (!find.trim() || (x.name + ' ' + x.type).toLowerCase().includes(find.trim().toLowerCase()))).map((x) => (
            <button key={x.id} className="tile" disabled={!x.available} aria-pressed={sel === x.id} onClick={() => { setSel(x.id); setDone(null); }}>
              <Pic p={x} />
              <div className="nm">{x.name}</div>
              {x.desc && <div className="ds">{x.desc}</div>}
              <div className="pr num">{x.available ? inr(x.price) + ' / ' + unitLabel(x.unit) : 'Out of stock'}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="col">
        <div className="panel col" style={{ gap: 12 }}>
          <div className="lcd">
            <div className="row">
              <span className="lab">{config.scale.model} · {scaleState}</span>
              <span className={'lamp' + (scale.live && scale.stable ? ' on' : '')}>{!scale.live ? 'Manual' : scale.stable ? 'Stable' : 'Settling'}</span>
            </div>
            <div className={'w' + (scale.live || (manualMode && qty) ? '' : ' off')}>{scale.live ? scale.net.toFixed(3) : manualMode && qty ? qty.toFixed(3) : '-.---'}<small>kg</small></div>
            <div className="row">
              <span className="lab">Tare {scale.tare.toFixed(3)} kg</span>
              <span className="lab">Gross {scale.gross.toFixed(3)} kg</span>
            </div>
            <div className="calc">
              {p ? (<><span>{p.name}</span><span>{qtyText(qty, p.unit)} x {p.price.toFixed(2)} = {inr(amount)}</span></>) : <span>Select a product to price this weight</span>}
            </div>
          </div>

          {manualMode && (
            <Field label="Weight in kg (scale not connected: type the weight shown on the scale)" id="manual-kg" type="number" inputMode="decimal" min={0} max={+config.scale.capacityKg || 30} step={step} placeholder="e.g. 1.250" autoFocus value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && canAdd) add(); }} />
          )}
          {p && !byWeight && (
            <Field label="Number of pieces (sold by count, scale not used)" id="pcs" type="number" min={1} step={1} value={pcs} onChange={(e) => setPcs(e.target.value)} />
          )}

          <div className="btns">
            <button className="btn go big" disabled={!canAdd} onClick={add}>{addLabel}</button>
            <button className="btn" onClick={scale.doTare} disabled={!scale.live}>Tare</button>
            <button className="btn" onClick={scale.clearTare} disabled={!scale.live}>Clear tare</button>
            {!scale.connected && <button className="btn" onClick={scale.connect}>Connect scale</button>}
          </div>

          {scale.demo && (
            <div className="sim">
              <div className="small muted">Demo weight is switched on in Settings. This slider stands in for the pan. Switch it off before real billing.</div>
              <input id="simw" type="range" min={0} max={+config.scale.capacityKg || 30} step={(+config.scale.divisionG || 5) / 1000} value={scale.target} aria-label="Demo weight on the pan" onChange={(e) => scale.setTarget(+e.target.value)} />
              <div className="btns">
                {[0, 0.25, 0.5, 1, 1.5, 2].map((v) => (
                  <button key={v} className="chip" onClick={() => scale.setTarget(v)}>{v === 0 ? 'Empty pan' : v.toFixed(3) + ' kg'}</button>
                ))}
              </div>
            </div>
          )}
          {scale.msg && <div className="note">{scale.msg}</div>}
        </div>

        <div className="panel">
          {done ? (
            <div className="col" style={{ gap: 12 }}>
              <div className="head" style={{ marginBottom: 0 }}>
                <h2>Receipt {done.no}</h2>
                <div className="btns">
                  <button className="btn" onClick={() => onPrint(done)}>Print again</button>
                  <button className="btn pri" onClick={() => setDone(null)}>Start next bill</button>
                </div>
              </div>
              <Receipt bill={done} config={config} />
            </div>
          ) : preview ? (
            <div className="col" style={{ gap: 12 }}>
              <div className="head" style={{ marginBottom: 0 }}>
                <h2>Print preview</h2>
                <span className="small muted">{config.printer.paperWidth} mm · {config.printer.copies} cop{config.printer.copies === '1' ? 'y' : 'ies'} · not saved yet</span>
              </div>
              <Receipt bill={preview} config={config} />
              <div className="btns">
                <button className="btn big" onClick={() => setPreview(null)}>Back to bill</button>
                <button className="btn pri big" onClick={confirmPrint}>Print receipt</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="head">
                <h2>Current bill</h2>
                {cart.length > 0 && <button className="btn" onClick={() => setCart([])}>Clear</button>}
              </div>
              {cart.length === 0 ? (
                <div className="empty">No items yet. Pick a product, weigh it, add it.</div>
              ) : (
                <div className="scroll">
                  <table>
                    <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th><th></th></tr></thead>
                    <tbody>
                      {cart.map((i, k) => (
                        <tr key={k}>
                          <td>{i.name}</td>
                          <td className="r num">{qtyText(i.qty, i.unit)}</td>
                          <td className="r num">{i.rate.toFixed(2)}</td>
                          <td className="r num">{i.amount.toFixed(2)}</td>
                          <td className="r"><button className="btn" aria-label={'Remove ' + i.name} onClick={() => setCart((c) => c.filter((_, j) => j !== k))}>Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="total">
                <span className="muted">{cart.length} item{cart.length === 1 ? '' : 's'} · rounded to the rupee</span>
                <span className="amt">{inr(total)}</span>
              </div>
              <div className="btns" style={{ marginTop: 12 }}>
                <div className="chips">
                  {['Cash', 'UPI', 'Card'].map((m) => (
                    <button key={m} className="chip" aria-pressed={pay === m} onClick={() => setPay(m)}>{m}</button>
                  ))}
                </div>
                <button className="btn pri big" disabled={!cart.length} onClick={finish}>Preview and print</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Products / inventory ---------- */
function Products({ products, setProducts }) {
  const blank = { name: '', type: 'Chicken', unit: 'kg', price: '', desc: '', img: '' };
  const [n, setN] = useState(blank);
  const [ask, setAsk] = useState(null);
  const upd = (id, patch) => setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const types = [...new Set(products.map((p) => p.type))];
  const ok = n.name.trim() && +n.price > 0;

  function addProduct(e) {
    e.preventDefault();
    if (!ok) return;
    setProducts((ps) => [...ps, { id: uid(), name: n.name.trim(), type: n.type.trim() || 'Other', unit: n.unit, price: +n.price, desc: n.desc.trim(), available: true, img: n.img }]);
    setN(blank);
  }
  const pickImage = (cb) => (e) => e.target.files[0] && fileToThumb(e.target.files[0], cb);

  return (
    <div className="col">
      <div className="panel">
        <div className="head"><h2>Add a product</h2></div>
        <form className="form" onSubmit={addProduct}>
          <Field label="Name" id="n-name" value={n.name} placeholder="e.g. Chicken wings" onChange={(e) => setN({ ...n, name: e.target.value })} />
          <Field label="Type" id="n-type" value={n.type} list="types" onChange={(e) => setN({ ...n, type: e.target.value })} />
          <datalist id="types">{types.map((t) => <option key={t} value={t} />)}</datalist>
          <Field label="Sold by" id="n-unit">
            <select id="n-unit" value={n.unit} onChange={(e) => setN({ ...n, unit: e.target.value })}>
              <option value="kg">Weight from scale (kg)</option>
              <option value="pc">Piece count</option>
            </select>
          </Field>
          <Field label={'Price (₹ per ' + unitLabel(n.unit) + ')'} id="n-price" type="number" min={0} step="0.5" value={n.price} onChange={(e) => setN({ ...n, price: e.target.value })} />
          <Field label="Short description (optional)" id="n-desc" value={n.desc} placeholder="e.g. Bone-in pieces for curry" onChange={(e) => setN({ ...n, desc: e.target.value })} />
          <div className="btns">
            <span className="btn filebtn">{n.img ? 'Image added' : 'Add image'}
              <input id="n-img" type="file" accept="image/*" aria-label="Product image" onChange={pickImage((img) => setN((x) => ({ ...x, img })))} />
            </span>
            <button className="btn pri" type="submit" disabled={!ok}>Add product</button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="head"><h2>Inventory</h2><span className="small muted">Changes save as you type</span></div>
        <div className="scroll">
          <table>
            <thead><tr><th>Image</th><th>Name</th><th>Description</th><th>Type</th><th>Sold by</th><th className="r">Price ₹</th><th>In stock</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="btns" style={{ flexWrap: 'nowrap' }}>
                      <Pic p={p} cls="thumb" />
                      <span className="btn filebtn small">Change
                        <input id={'img-' + p.id} type="file" accept="image/*" aria-label={'Change image for ' + p.name} onChange={pickImage((img) => upd(p.id, { img }))} />
                      </span>
                    </div>
                  </td>
                  <td><input id={'nm-' + p.id} className="name" aria-label="Name" value={p.name} onChange={(e) => upd(p.id, { name: e.target.value })} /></td>
                  <td><input id={'ds-' + p.id} className="name" aria-label="Description" value={p.desc || ''} onChange={(e) => upd(p.id, { desc: e.target.value })} /></td>
                  <td><input id={'ty-' + p.id} aria-label="Type" list="types" value={p.type} style={{ minWidth: 110 }} onChange={(e) => upd(p.id, { type: e.target.value })} /></td>
                  <td>
                    <select id={'un-' + p.id} aria-label="Sold by" value={p.unit} style={{ minWidth: 90 }} onChange={(e) => upd(p.id, { unit: e.target.value })}>
                      <option value="kg">kg</option>
                      <option value="pc">piece</option>
                    </select>
                  </td>
                  <td className="r"><input id={'pr-' + p.id} className="price" aria-label="Price" type="number" min={0} step="0.5" value={p.price} onChange={(e) => upd(p.id, { price: +e.target.value || 0 })} /></td>
                  <td><input id={'av-' + p.id} type="checkbox" aria-label="In stock" checked={p.available} style={{ width: 18, height: 18 }} onChange={(e) => upd(p.id, { available: e.target.checked })} /></td>
                  <td className="r">
                    {ask === p.id ? (
                      <div className="btns" style={{ flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                        <button className="btn danger" onClick={() => { setProducts((ps) => ps.filter((x) => x.id !== p.id)); setAsk(null); }}>Delete</button>
                        <button className="btn" onClick={() => setAsk(null)}>Keep</button>
                      </div>
                    ) : (
                      <button className="btn" onClick={() => setAsk(p.id)}>Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Bills for any day ---------- */
function Bills({ today, todayBills, config, onPrint }) {
  const [day, setDay] = useState(today);
  const [old, setOld] = useState([]);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    setOpen(null);
    if (day === today) return;
    let live = true;
    loadFile('bills-' + day + '.xml').then((x) => live && setOld(x ? readBills(x) : [])).catch(() => live && setOld([]));
    return () => { live = false; };
  }, [day, today]);

  const bills = day === today ? todayBills : old;
  const total = bills.reduce((s, b) => s + b.total, 0);
  const kg = bills.reduce((s, b) => s + b.items.filter((i) => i.unit === 'kg').reduce((a, i) => a + i.qty, 0), 0);
  const b = bills.find((x) => x.no === open);

  return (
    <div className="till">
      <div className="panel">
        <div className="head">
          <h2>Daily bills</h2>
          <Field label="Date" id="bill-day" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} />
        </div>
        <div className="stats" style={{ marginBottom: 12 }}>
          <div><span className="small muted">Sales</span><b>{inr(total)}</b></div>
          <div><span className="small muted">Bills</span><b>{bills.length}</b></div>
          <div><span className="small muted">Weight sold</span><b>{kg.toFixed(3)} kg</b></div>
        </div>
        {bills.length === 0 ? (
          <div className="empty">No bills on {day}.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead><tr><th>Bill no</th><th>Time</th><th>Paid by</th><th className="r">Items</th><th className="r">Total</th><th></th></tr></thead>
              <tbody>
                {[...bills].reverse().map((x) => (
                  <tr key={x.no}>
                    <td className="num">{x.no}</td>
                    <td className="num">{x.time.slice(-5)}</td>
                    <td>{x.pay}</td>
                    <td className="r num">{x.items.length}</td>
                    <td className="r num">{inr(x.total)}</td>
                    <td className="r"><button className="btn" onClick={() => setOpen(x.no)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted" style={{ margin: '12px 0 0' }}>Stored in transactions/bills-{day}.xml</p>
      </div>
      <div className="panel">
        <div className="head">
          <h2>{b ? 'Receipt copy' : 'Receipt'}</h2>
          {b && <button className="btn pri" onClick={() => onPrint(b)}>Print again</button>}
        </div>
        {b ? <Receipt bill={b} config={config} /> : <div className="empty">Choose View on a bill to see its receipt.</div>}
      </div>
    </div>
  );
}

/* ---------- Reports: reads the daily bill files in the transactions folder ---------- */
function Reports({ today, todayBills }) {
  const [from, setFrom] = useState(today.slice(0, 8) + '01');
  const [to, setTo] = useState(today);
  const [days, setDays] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const files = await listFiles();
        const wanted = files
          .map((f) => (f.match(/^bills-(\d{4}-\d{2}-\d{2})\.xml$/) || [])[1])
          .filter((d) => d && d >= from && d <= to && d !== today);
        const out = await Promise.all(wanted.map(async (d) => ({ day: d, bills: readBills((await loadFile('bills-' + d + '.xml')) || '<bills/>') })));
        if (today >= from && today <= to) out.push({ day: today, bills: todayBills });
        out.sort((a, b) => (a.day < b.day ? 1 : -1));
        if (live) setDays(out.filter((d) => d.bills.length));
      } catch (e) {
        if (live) setDays([]);
      }
    })();
    return () => { live = false; };
  }, [from, to, today, todayBills]);

  const back = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dateKey(d); };
  const ranges = [['Today', today, today], ['Last 7 days', back(6), today], ['This month', today.slice(0, 8) + '01', today], ['Last 30 days', back(29), today]];

  const rep = useMemo(() => {
    const all = (days || []).flatMap((d) => d.bills);
    const pay = {};
    const prod = {};
    for (const b of all) {
      pay[b.pay] = (pay[b.pay] || 0) + b.total;
      for (const i of b.items) {
        const r = (prod[i.name] = prod[i.name] || { name: i.name, unit: i.unit, qty: 0, amount: 0 });
        r.qty += i.qty;
        r.amount += i.amount;
      }
    }
    const daily = (days || []).map((d) => ({
      day: d.day,
      count: d.bills.length,
      sales: d.bills.reduce((s, b) => s + b.total, 0),
      kg: d.bills.reduce((s, b) => s + b.items.filter((i) => i.unit === 'kg').reduce((a, i) => a + i.qty, 0), 0),
    }));
    const sales = all.reduce((s, b) => s + b.total, 0);
    return {
      sales, count: all.length, pay, daily,
      kg: daily.reduce((s, d) => s + d.kg, 0),
      products: Object.values(prod).sort((a, b) => b.amount - a.amount),
      maxDay: Math.max(1, ...daily.map((d) => d.sales)),
    };
  }, [days]);
  const maxProd = Math.max(1, ...rep.products.map((p) => p.amount));

  return (
    <div className="col">
      <div className="panel">
        <div className="head">
          <h2>Sales report</h2>
          <div className="chips">
            {ranges.map(([label, f, t]) => (
              <button key={label} className="chip" aria-pressed={from === f && to === t} onClick={() => { setFrom(f); setTo(t); }}>{label}</button>
            ))}
          </div>
        </div>
        <div className="form" style={{ marginBottom: 16 }}>
          <Field label="From" id="rep-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value || from)} />
          <Field label="To" id="rep-to" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value || to)} />
        </div>
        <div className="stats">
          <div><span className="small muted">Sales</span><b>{inr(rep.sales)}</b></div>
          <div><span className="small muted">Bills</span><b>{rep.count}</b></div>
          <div><span className="small muted">Average bill</span><b>{inr(rep.count ? rep.sales / rep.count : 0)}</b></div>
          <div><span className="small muted">Weight sold</span><b>{rep.kg.toFixed(3)} kg</b></div>
          {['Cash', 'UPI', 'Card'].map((m) => (
            <div key={m}><span className="small muted">{m}</span><b>{inr(rep.pay[m] || 0)}</b></div>
          ))}
        </div>
      </div>

      {days === null ? (
        <div className="empty">Reading the transactions folder…</div>
      ) : rep.count === 0 ? (
        <div className="panel empty">No bills between {from} and {to}.</div>
      ) : (
        <div className="till">
          <div className="panel">
            <div className="head"><h2>Day by day</h2></div>
            <div className="scroll">
              <table>
                <thead><tr><th>Date</th><th className="r">Bills</th><th className="r">Weight</th><th className="r">Sales</th><th></th></tr></thead>
                <tbody>
                  {rep.daily.map((d) => (
                    <tr key={d.day}>
                      <td className="num">{d.day.split('-').reverse().join('/')}</td>
                      <td className="r num">{d.count}</td>
                      <td className="r num">{d.kg.toFixed(3)} kg</td>
                      <td className="r num">{inr(d.sales)}</td>
                      <td className="barcell"><div className="bar" style={{ width: (d.sales / rep.maxDay) * 100 + '%' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <div className="head"><h2>Product by product</h2></div>
            <div className="scroll">
              <table>
                <thead><tr><th>Product</th><th className="r">Sold</th><th className="r">Amount</th><th></th></tr></thead>
                <tbody>
                  {rep.products.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td className="r num">{qtyText(p.unit === 'kg' ? p.qty : Math.round(p.qty), p.unit)}</td>
                      <td className="r num">{inr(p.amount)}</td>
                      <td className="barcell"><div className="bar red" style={{ width: (p.amount / maxProd) * 100 + '%' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Settings ---------- */
function Settings({ config, setConfig, scale, onTestPrint }) {
  const set = (sec, k) => (e) => setConfig((c) => ({ ...c, [sec]: { ...c[sec], [k]: e.target.value } }));
  const I = (sec, k, label, extra) => <Field label={label} id={sec + '-' + k} value={config[sec][k] ?? ''} onChange={set(sec, k)} {...extra} />;
  const S = (sec, k, label, opts) => (
    <Field label={label} id={sec + '-' + k}>
      <select id={sec + '-' + k} value={config[sec][k]} onChange={set(sec, k)}>
        {opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </Field>
  );
  return (
    <div className="col">
      <div className="panel">
        <div className="head"><h2>Shop details on the receipt</h2></div>
        <div className="form">{I('shop', 'name', 'Shop name')}{I('shop', 'address', 'Address')}{I('shop', 'phone', 'Phone')}{I('shop', 'gstin', 'GSTIN (optional)')}</div>
      </div>

      <div className="panel">
        <div className="head"><h2>Receipt printer</h2><button className="btn" onClick={onTestPrint}>Print test receipt</button></div>
        <div className="form">
          {I('printer', 'name', 'Printer model')}
          {S('printer', 'paperWidth', 'Paper roll width', [['80', '80 mm (3 inch)'], ['58', '58 mm (2 inch)']])}
          {S('printer', 'copies', 'Copies per bill', [['1', '1'], ['2', '2'], ['3', '3']])}
          {I('printer', 'footer', 'Footer line')}
        </div>
        <p className="small muted" style={{ margin: '12px 0 0' }}>Receipts go to the Windows default printer. Set the {config.printer.name} as default in Windows, and open the till with start.bat so no print dialog appears.</p>
      </div>

      <div className="panel">
        <div className="head">
          <h2>Weighing machine</h2>
          <div className="btns">
            <span className={'status' + (scale.connected ? '' : ' fail')}>{scale.connected ? 'Connected' : 'Not connected'}</span>
            {!scale.connected && <button className="btn" onClick={scale.connect}>Connect scale</button>}
          </div>
        </div>
        <div className="form">
          {I('scale', 'model', 'Model')}
          {I('scale', 'capacityKg', 'Capacity (kg)', { type: 'number', min: 1 })}
          {I('scale', 'divisionG', 'Accuracy step (g)', { type: 'number', min: 1 })}
          {I('scale', 'minimumG', 'Minimum weight (g)', { type: 'number', min: 0 })}
          {S('scale', 'baudRate', 'Baud rate', ['1200', '2400', '4800', '9600', '19200', '38400', '115200'].map((v) => [v, v]))}
          {S('scale', 'dataBits', 'Data bits', [['8', '8'], ['7', '7']])}
          {S('scale', 'parity', 'Parity', [['none', 'None'], ['even', 'Even'], ['odd', 'Odd']])}
          {S('scale', 'sends', 'Scale sends weight in', [['kg', 'Kilograms (1.250)'], ['g', 'Grams (1250)']])}
          {S('scale', 'demo', 'Demo weight slider', [['false', 'Off (real billing)'], ['true', 'On (no machine)']])}
        </div>
        <p className="small muted" style={{ margin: '12px 0 0' }}>
          Data received from the scale appears below. Readable numbers mean the settings are right. Garbled characters mean the baud rate is wrong: change it, unplug and replug the USB cable, and connect again.
        </p>
        <pre className="raw" tabIndex={0}>{scale.lines.length ? scale.lines.join('\n') : scale.connected ? 'Connected. Waiting for data from the scale…' : 'Nothing received. The scale is not connected.'}</pre>
        {scale.msg && <div className="note" style={{ marginTop: 12 }}>{scale.msg}</div>}
      </div>
    </div>
  );
}

/* ---------- saving: every change is written to its XML file ---------- */
function useSaved(name, xml, initial, setStatus) {
  const last = useRef(initial);
  useEffect(() => {
    if (xml === last.current) return;
    const t = setTimeout(() => {
      saveFile(name, xml).then(
        () => { last.current = xml; setStatus('ok'); },
        () => setStatus('fail')
      );
    }, 250);
    return () => clearTimeout(t);
  }, [name, xml]);
}

function Main({ init }) {
  const [products, setProducts] = useState(init.products);
  const [config, setConfig] = useState(init.config);
  const [day, setDay] = useState(init.day);
  const [bills, setBills] = useState(init.bills);
  const [tab, setTab] = useState('Billing');
  const [status, setStatus] = useState('ok');
  const [job, setJob] = useState(null);
  const scale = useScale(config.scale);

  const pX = useMemo(() => productsXML(products), [products]);
  const cX = useMemo(() => configXML(config), [config]);
  const bX = useMemo(() => billsXML(day, bills), [day, bills]);
  useSaved('products.xml', pX, init.raw.p, setStatus);
  useSaved('config.xml', cX, init.raw.c, setStatus);
  useSaved('bills-' + day + '.xml', bX, init.raw.b, setStatus);

  // A new day starts a new bills file and restarts bill numbers at 001.
  useEffect(() => {
    const id = setInterval(() => {
      const now = dateKey();
      if (now !== day) { setDay(now); setBills([]); }
    }, 30000);
    return () => clearInterval(id);
  }, [day]);

  // Printing: the receipt is placed in a print-only area, then sent to the printer.
  useEffect(() => {
    if (!job) return;
    const t = setTimeout(() => window.print(), 80);
    const done = () => setJob(null);
    window.addEventListener('afterprint', done);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [job]);
  const print = (bill) => setJob({ bill, at: Date.now() });
  const testPrint = () => print({
    no: 'TEST', time: new Date().toLocaleString('en-IN'), pay: 'Test', sub: 180, round: 0, total: 180,
    items: [{ name: 'Test item', unit: 'kg', qty: 0.75, rate: 240, amount: 180 }],
  });
  const copies = Math.min(3, Math.max(1, +config.printer.copies || 1));

  const tabs = ['Billing', 'Products', 'Bills', 'Reports', 'TV Preview', 'Settings'];
  return (
    <>
      <header className="top">
        <img className="banner" src={banner} alt={config.shop.name + ', ' + config.shop.address} />
        <div className="brand">
          <img src={logo} alt="" />
          <div><h1>{config.shop.name}</h1><p>{config.shop.address}</p></div>
        </div>
        <div className="navrow">
          <nav className="tabs" aria-label="Sections">
            {tabs.map((t) => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}
          </nav>
          <span className={'status' + (status === 'fail' ? ' fail' : '')}>{status === 'fail' ? 'Not saving. Start server.js and reload.' : 'All changes saved'}</span>
        </div>
      </header>
      <main>
        {tab === 'Billing' && <Billing products={products} config={config} scale={scale} nextNo={bills.length + 1} saveBill={(b) => setBills((x) => [...x, b])} onPrint={print} />}
        {tab === 'Products' && <Products products={products} setProducts={setProducts} />}
        {tab === 'Bills' && <Bills today={day} todayBills={bills} config={config} onPrint={print} />}
        {tab === 'Reports' && <Reports today={day} todayBills={bills} />}
        {tab === 'TV Preview' && <TvAdmin products={products} config={config} setConfig={setConfig} />}
        {tab === 'Settings' && <Settings config={config} setConfig={setConfig} scale={scale} onTestPrint={testPrint} />}
      </main>
      <div className="print-area" aria-hidden="true">
        {job && Array.from({ length: copies }, (_, i) => <Receipt key={i} bill={job.bill} config={config} />)}
      </div>
    </>
  );
}

export default function App() {
  const [init, setInit] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const day = dateKey();
        const [p, c, b] = await Promise.all([loadFile('products.xml'), loadFile('config.xml'), loadFile('bills-' + day + '.xml'), loadFolderImages()]);
        const saved = c ? readConfig(c) : {};
        // The first version shipped placeholder shop details; replace them with the real ones from the banner.
        if (saved.shop && saved.shop.name === 'CityChicken' && saved.shop.address === 'Shop address line, Chennai') {
          saved.shop = { ...saved.shop, name: SEED_CONFIG.shop.name, address: SEED_CONFIG.shop.address };
        }
        // When a newer catalogue ships, add its new products to the shop's own list. Existing products, prices and photos are kept.
        let products = p ? readProducts(p) : SEED_PRODUCTS;
        if (p && (!saved.shop || saved.shop.catalog !== SEED_CONFIG.shop.catalog)) {
          const ids = new Set(products.map((x) => x.id));
          const names = new Set(products.map((x) => x.name.toLowerCase()));
          products = [
            ...products.map((x) => (x.desc ? x : { ...x, desc: (SEED_PRODUCTS.find((q) => q.id === x.id && q.name === x.name) || {}).desc || '' })),
            ...SEED_PRODUCTS.filter((q) => !ids.has(q.id) && !names.has(q.name.toLowerCase())),
          ];
        }
        setInit({
          day,
          raw: { p, c, b },
          products,
          config: {
            shop: { ...SEED_CONFIG.shop, ...saved.shop, catalog: SEED_CONFIG.shop.catalog },
            printer: { ...SEED_CONFIG.printer, ...saved.printer },
            scale: { ...SEED_CONFIG.scale, ...saved.scale },
            tv: { ...SEED_CONFIG.tv, ...saved.tv },
          },
          bills: b ? readBills(b) : [],
        });
      } catch (e) {
        setErr('The till could not read its data files. Start it with start.bat (or "node server.js") and reload this page.');
      }
    })();
  }, []);
  if (err) return <div className="panel"><h2>CityChicken POS cannot start</h2><p>{err}</p></div>;
  if (!init) return <div className="empty">Loading shop data…</div>;
  return <Main init={init} />;
}
