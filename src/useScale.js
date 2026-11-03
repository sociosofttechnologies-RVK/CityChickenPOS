import { useState, useEffect, useRef } from 'react';

// Pulls the weight out of one line sent by the scale, e.g. "ST,GS,+ 1.250kg" or "  1.250".
export function parseWeight(line, sends) {
  const m = line.match(/[-+]?\s*\d+(?:\.\d+)?/);
  if (!m) return null;
  const v = parseFloat(m[0].replace(/\s/g, ''));
  if (Number.isNaN(v)) return null;
  return sends === 'g' ? v / 1000 : v;
}

// Reads the weighing machine over its USB (serial) port using the browser's Web Serial support.
// The first connection needs one click on "Connect scale"; after that the port is reopened automatically.
export function useScale(cfg) {
  const [raw, setRaw] = useState(0);
  const [target, setT] = useState(0);
  const [tare, setTare] = useState(0);
  const [connected, setConnected] = useState(false);
  const [serialStable, setSS] = useState(false);
  const [msg, setMsg] = useState('');
  const [lines, setLines] = useState([]);
  const tRef = useRef(0);
  const last = useRef(null);
  const busy = useRef(false);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const demo = cfg.demo === 'true' && !connected;
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator;

  // Demo weight: follows the slider, for trying the till without a machine.
  useEffect(() => {
    if (!demo) return;
    const id = setInterval(
      () =>
        setRaw((r) => {
          const d = tRef.current - r;
          if (Math.abs(d) < 0.002) return tRef.current;
          return r + d * 0.4 + (Math.random() - 0.5) * 0.006;
        }),
      120
    );
    return () => clearInterval(id);
  }, [demo]);

  async function open(port) {
    if (busy.current) return;
    busy.current = true;
    const c = cfgRef.current;
    let reader;
    try {
      await port.open({ baudRate: +c.baudRate || 9600, dataBits: +c.dataBits || 8, parity: c.parity || 'none' });
      setConnected(true);
      setMsg('');
      setTare(0);
      const dec = new TextDecoder();
      reader = port.readable.getReader();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split(/[\r\n=]+/);
        buf = parts.pop();
        if (buf.length > 64) buf = '';
        for (const ln of parts) {
          if (!ln.trim()) continue;
          setLines((l) => [...l.slice(-7), ln]);
          const v = parseWeight(ln, cfgRef.current.sends);
          if (v == null) continue;
          setSS(last.current === v);
          last.current = v;
          setRaw(v);
        }
      }
    } catch (e) {
      setMsg('Scale is not connected: ' + (e && e.message ? e.message : 'port could not be opened') + '. Check the USB cable, then press Connect scale.');
    } finally {
      try {
        if (reader) reader.releaseLock();
        await port.close();
      } catch (e) {
        /* port already gone */
      }
      busy.current = false;
      last.current = null;
      setConnected(false);
      setSS(false);
      setRaw(0);
    }
  }

  // Reopen the port the shop already allowed, on start and whenever the cable is plugged back in.
  useEffect(() => {
    if (!supported) return;
    const auto = () => navigator.serial.getPorts().then((ps) => ps[0] && open(ps[0])).catch(() => {});
    auto();
    navigator.serial.addEventListener('connect', auto);
    return () => navigator.serial.removeEventListener('connect', auto);
  }, []);

  async function connect() {
    if (!supported) {
      setMsg('This browser cannot read USB serial devices. Open the till in Google Chrome or Microsoft Edge.');
      return;
    }
    try {
      const port = await navigator.serial.requestPort();
      open(port);
    } catch (e) {
      /* the port chooser was closed without picking a port */
    }
  }

  const div = (+cfg.divisionG || 5) / 1000;
  const rd = (v) => Math.round(v / div) * div + 0;
  const live = connected || demo;
  return {
    live,
    connected,
    demo,
    net: rd(raw - tare),
    gross: rd(raw),
    tare: rd(tare),
    stable: connected ? serialStable : demo && raw === target,
    msg,
    lines,
    target,
    setTarget: (v) => {
      tRef.current = v;
      setT(v);
    },
    connect,
    doTare: () => setTare(raw),
    clearTare: () => setTare(0),
  };
}
