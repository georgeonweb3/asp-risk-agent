const MOCK_MODE = process.env.MOCK_MODE === "true";

/**
 * Thin wrapper around the CDP SDK agent wallet. In MOCK_MODE this just logs
 * what *would* happen — useful for the demo video and for testing the
 * decision engine without spending real gas or requiring live CDP creds.
 *
 * To go live: fill in the real CDP calls in executeReal(), matching however
 * your existing Termux CDP wallet setup already initializes the wallet
 * (Coinbase, "CDP SDK").
 */
async function executeAction({ action, address, amountUsd, reason }) {
  if (action === "block") {
    return log({ action, address, amountUsd, reason, executed: false });
  }

  if (action === "flag_for_review") {
    return log({
      action,
      address,
      amountUsd,
      reason,
      executed: false,
      note: "Held for manual approval — not executed automatically."
    });
  }

  if (action === "approve") {
    if (MOCK_MODE) {
      return log({
        action,
        address,
        amountUsd,
        reason,
        executed: true,
        note: "MOCK_MODE — simulated execution, no real transaction sent."
      });
    }
    return executeReal({ address, amountUsd, reason });
  }

  throw new Error(`Unknown action: ${action}`);
}

function log(result) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${result.action.toUpperCase()}]`, JSON.stringify(result));
  return { ...result, timestamp: ts };
}

async function executeReal({ address, amountUsd, reason }) {
  // Wire this up to your existing CDP SDK wallet instance from the Termux
  // agent-wallet build. Sketch:
  //
  //   const { Coinbase, Wallet } = require("@coinbase/coinbase-sdk");
  //   Coinbase.configure({ apiKeyName: process.env.CDP_API_KEY_NAME, privateKey: process.env.CDP_API_KEY_PRIVATE_KEY });
  //   const wallet = await Wallet.fetch(process.env.CDP_WALLET_ID);
  //   const transfer = await wallet.createTransfer({ amount: amountUsd, assetId: "usdc", destination: address });
  //   await transfer.wait();
  //
  // Left as a stub since it depends on your existing wallet/key setup.
  throw new Error("executeReal() not yet wired to live CDP wallet — set MOCK_MODE=true for now.");
}

module.exports = { executeAction };
