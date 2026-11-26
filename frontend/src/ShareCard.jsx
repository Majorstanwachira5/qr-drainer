import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function ShareCard() {
  const [copied, setCopied] = useState(false);
  const svgRef = useRef(null);
  const url = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      prompt("Copy this lab link:", url);
    }
  };

  const downloadQR = () => {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width * 2; c.height = img.height * 2;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const a = document.createElement("a");
      a.href = c.toDataURL("image/png");
      a.download = "tron-approval-lab-qr.png";
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
  };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h2>Share the Lab</h2>
      <p className="sub">
        Send this link/QR to classmates. Visitors open in <b>Sandbox</b> (offline mock replay).
        Anyone with a <b>Shasta</b> wallet can toggle <b>Live</b> and test the approve→drain on
        mock tokens themselves. <b>Testnet + mock only — never real funds.</b>
      </p>
      <div ref={svgRef} style={{ display: "inline-block", background: "#fff", padding: 10, borderRadius: 10 }}>
        <QRCodeSVG value={url} size={120} />
      </div>
      <div className="btnrow" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={copyLink}>
          {copied ? "✓ Copied" : "Copy Lab Link"}
        </button>
        <button className="btn ghost" onClick={downloadQR}>Download QR</button>
      </div>
    </div>
  );
}