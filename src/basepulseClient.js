const axios = require("axios");

const MOCK_MODE = process.env.MOCK_MODE === "true";
// Live BasePulse Trust Score API (Render free tier — cold-starts after idle).
const BASEPULSE_API_URL = process.env.BASEPULSE_API_URL || "https://basepulse-trust.onrender.com";
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 8000; // matches the frontend's useTrustScore.js retry pacing

/**
 * Deterministic mock scorer, used only when MOCK_MODE=true (no live BasePulse
 * endpoint reachable, e.g. during offline demo prep). Swap this out entirely
 * once wired to your real BasePulse API — the real call is below.
 */
function mockScore(address) {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  const score = hash % 101; // 0-100
  return {
    address,
    trustScore: score,
    source: "mock",
    signals: {
      walletAgeDays: (hash % 900) + 1,
      attestationCount: hash % 12,
      priorFlags: score < 30 ? (hash % 4) + 1 : 0
    }
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a trust score for a given address from the live BasePulse API.
 * Real route: GET /score/:address
 * Real response shape: { address, score, breakdown, raw: { txCount, ... } }
 *
 * Render's free tier cold-starts after idle, so this retries with the same
 * pacing as the frontend's useTrustScore.js hook (up to 4 retries, 8s apart)
 * rather than failing fast — a cold API shouldn't look like a broken agent
 * mid-demo.
 */
async function getTrustScore(address) {
  if (MOCK_MODE) {
    return mockScore(address);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get(`${BASEPULSE_API_URL}/score/${address}`, {
        timeout: 15000
      });
      const data = res.data;
      return {
        address: data.address,
        trustScore: data.score,
        breakdown: data.breakdown,
        raw: data.raw,
        signals: data.raw || null,
        source: "live"
      };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      // Fail-safe: if BasePulse is unreachable after all retries, don't
      // silently auto-approve. Treat as unknown and let the decision
      // engine route it to manual review.
      return {
        address,
        trustScore: null,
        source: "unavailable",
        error: err.message
      };
    }
  }
}

module.exports = { getTrustScore };
