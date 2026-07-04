require("dotenv").config();
const express = require("express");
const { getTrustScore } = require("./basepulseClient");
const { decide } = require("./decisionEngine");
const { executeAction } = require("./cdpWallet");

const app = express();
app.use(express.json());

/**
 * POST /check
 * Body: { address: "0x...", amountUsd: 1200 }
 *
 * This is the ASP's core callable service: given a counterparty address and
 * a requested transaction amount, it returns (and optionally executes) a
 * risk decision. This is the endpoint OKX.AI's ASP listing should point at.
 */
app.post("/check", async (req, res) => {
  const { address, amountUsd } = req.body;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'address' field." });
  }

  try {
    const scoreResult = await getTrustScore(address);
    const decision = decide({
      trustScore: scoreResult.trustScore,
      requestedAmountUsd: amountUsd || 0
    });

    const execResult = await executeAction({
      action: decision.action,
      address,
      amountUsd: amountUsd || 0,
      reason: decision.reason
    });

    res.json({
      address,
      requestedAmountUsd: amountUsd || 0,
      trustScore: scoreResult.trustScore,
      scoreSource: scoreResult.source,
      signals: scoreResult.signals || null,
      decision: decision.action,
      reason: decision.reason,
      execution: execResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", mockMode: process.env.MOCK_MODE === "true" });
});

const PORT = process.env.PORT || 4021;
app.listen(PORT, () => {
  console.log(`Risk agent ASP listening on :${PORT} (MOCK_MODE=${process.env.MOCK_MODE})`);
});
