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

// Real Base addresses — swap the labels below once you know each one's
// rough on-chain history, so the demo narration matches what actually comes back.
const scenarios = [
  {
    label: "Address 1",
    address: "0xfFDd2f83555c64d1CaA17f5646C08b80013ED38b",
    amountUsd: 500
  },
  {
    label: "Address 2",
    address: "0xb3aa20a71326d1d627e3097427514a30894d0fa8",
    amountUsd: 800
  },
  {
    label: "Address 3",
    address: "0x81e921FE18a4DCff8278d790BB0A4056E42c26A9",
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
