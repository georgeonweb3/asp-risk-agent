/**
 * demo/simulate.js
 *
 * Run this against the live server (npm start, then in another Termux
 * session: npm run demo) to produce a clean, narratable demo sequence
 * for the #okxai submission video/screenshots.
 *
 * Labels are derived from each real decision returned by the agent,
 * not hardcoded — since we don't know each address's actual BasePulse
 * score ahead of time, this reads correctly no matter what comes back.
 */
const axios = require("axios");

const PORT = process.env.PORT || 4021;
const BASE_URL = `http://localhost:${PORT}`;

// Real Base addresses to screen.
const scenarios = [
  { address: "0xfFDd2f83555c64d1CaA17f5646C08b80013ED38b", amountUsd: 500 },
  { address: "0xb3aa20a71326d1d627e3097427514a30894d0fa8", amountUsd: 800 },
  { address: "0x81e921FE18a4DCff8278d790BB0A4056E42c26A9", amountUsd: 250 }
];

const DECISION_LABELS = {
  block: "🔴 BLOCKED",
  flag_for_review: "🟡 FLAGGED FOR REVIEW",
  approve: "🟢 AUTO-APPROVED"
};

async function checkAddress(address, amountUsd) {
  const res = await axios.post(`${BASE_URL}/check`, { address, amountUsd });
  return res.data;
}

async function run() {
  console.log("=== BasePulse Autonomous Counterparty-Risk Agent — Demo ===\n");

  const results = [];

  for (const [i, s] of scenarios.entries()) {
    console.log(`--- Checking counterparty ${i + 1} of ${scenarios.length} ---`);
    console.log(`Address: ${s.address}`);
    console.log(`Requested amount: $${s.amountUsd}`);

    try {
      const data = await checkAddress(s.address, s.amountUsd);
      const label = DECISION_LABELS[data.decision] || data.decision.toUpperCase();

      console.log(`Trust score: ${data.trustScore ?? "unavailable"} (source: ${data.scoreSource})`);
      console.log(`Decision: ${label}`);
      console.log(`Reason: ${data.reason}\n`);

      results.push({ address: s.address, decision: data.decision, trustScore: data.trustScore });
    } catch (err) {
      console.error(`Request failed: ${err.message}\n`);
      results.push({ address: s.address, decision: "error", trustScore: null });
    }
  }

  console.log("=== Summary ===");
  for (const r of results) {
    const label = DECISION_LABELS[r.decision] || r.decision.toUpperCase();
    console.log(`${r.address}  →  score ${r.trustScore ?? "N/A"}  →  ${label}`);
  }

  console.log("\n=== Demo complete ===");
}

run();
