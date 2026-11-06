const { test } = require("node:test");
const assert = require("node:assert/strict");

// Thresholds are read from env at module load; pin them before requiring
// so the suite is deterministic no matter what the host .env says.
process.env.THRESHOLD_BLOCK = "30";
process.env.THRESHOLD_FLAG = "65";

const { decide, THRESHOLD_BLOCK, THRESHOLD_FLAG } = require("../src/decisionEngine");

test("thresholds load as the pinned test values", () => {
  assert.equal(THRESHOLD_BLOCK, 30);
  assert.equal(THRESHOLD_FLAG, 65);
});

test("missing trust score defaults to flag_for_review, never approve", () => {
  for (const trustScore of [null, undefined]) {
    const d = decide({ trustScore, requestedAmountUsd: 100 });
    assert.equal(d.action, "flag_for_review");
    assert.match(d.reason, /unavailable/i);
  }
});

test("scores below the block threshold are blocked", () => {
  for (const trustScore of [0, 1, 15, 29]) {
    const d = decide({ trustScore, requestedAmountUsd: 100 });
    assert.equal(d.action, "block", `score ${trustScore} should block`);
    assert.match(d.reason, /below the block threshold/);
  }
});

test("block threshold boundary: 30 is not blocked, it is flagged", () => {
  const d = decide({ trustScore: 30, requestedAmountUsd: 100 });
  assert.equal(d.action, "flag_for_review");
});

test("mid-band scores are flagged for review", () => {
  for (const trustScore of [30, 45, 64]) {
    const d = decide({ trustScore, requestedAmountUsd: 100 });
    assert.equal(d.action, "flag_for_review", `score ${trustScore} should flag`);
    assert.match(d.reason, /mid-confidence band/);
  }
});

test("flag threshold boundary: 65 approves at a normal amount", () => {
  const d = decide({ trustScore: 65, requestedAmountUsd: 100 });
  assert.equal(d.action, "approve");
});

test("high scores approve at normal amounts", () => {
  for (const trustScore of [65, 80, 100]) {
    const d = decide({ trustScore, requestedAmountUsd: 250 });
    assert.equal(d.action, "approve", `score ${trustScore} should approve`);
    assert.match(d.reason, /auto-approve threshold/);
  }
});

test("high trust still flags amounts above the auto-approve cap", () => {
  const d = decide({ trustScore: 95, requestedAmountUsd: 5001 });
  assert.equal(d.action, "flag_for_review");
  assert.match(d.reason, /exceeds the auto-approve cap/);
});

test("amount exactly at the cap still approves", () => {
  const d = decide({ trustScore: 95, requestedAmountUsd: 5000 });
  assert.equal(d.action, "approve");
});

test("amount defaults to 0 when omitted", () => {
  const d = decide({ trustScore: 90 });
  assert.equal(d.action, "approve");
});

test("low score blocks regardless of amount", () => {
  const d = decide({ trustScore: 5, requestedAmountUsd: 99999 });
  assert.equal(d.action, "block");
});
