/**
 * demo/simulate.js
 *
 * Run this against the live server (npm start, then in another Termux
 * session: npm run demo) to produce a clean, narratable demo sequence:
 * one blocked address, one flagged, one auto-approved. This is what you
 * screen-record for the #okxai submission.
 */
const axios = require("axios");

const PORT = process.env.PORT || 4021;
const BASE_URL = `http://localhost:${PORT}`;

// Addresses chosen (via the mock hash) to land in each risk band.
// Swap these for real addresses with known BasePulse scores once you're
// off MOCK_MODE — pick one low-rep, one mid, one established/high-rep wallet.
const scenarios = [
  {
    label: "Low-trust address — should BLOCK",
    address: "0x000000000000000000000000000000000dead1",
    amountUsd: 500
  },
  {
    label: "Mid-trust address — should FLAG for review",
    address: "0x1111111111111111111111111111111111beef",
    amountUsd: 800
  },
  {
    label: "High-trust, small amount — should AUTO-APPROVE",
    address: "0x2222222222222222222222222222222222c0de",
    amountUsd: 250
  }
];

async function run() {
  console.log("=== BasePulse Autonomous Counterparty-Risk Agent — Demo ===\n");

  for (const s of scenarios) {
    console.log(`--- ${s.label} ---`);
    console.log(`Address: ${s.address} | Amount: $${s.amountUsd}`);
    try {
      const res = await axios.post(`${BASE_URL}/check`, {
        address: s.address,
        amountUsd: s.amountUsd
      });
      console.log(`Trust score: ${res.data.trustScore}`);
      console.log(`Decision: ${res.data.decision.toUpperCase()}`);
      console.log(`Reason: ${res.data.reason}\n`);
    } catch (err) {
      console.error("Demo request failed:", err.message, "\n");
    }
  }

  console.log("=== Demo complete ===");
}

run();
