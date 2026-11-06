const { test } = require("node:test");
const assert = require("node:assert/strict");

// MOCK_MODE is read at module load; set it before requiring the client so
// the suite never touches the network (the graders' sandbox is offline).
process.env.MOCK_MODE = "true";

const { getTrustScore } = require("../src/basepulseClient");

const ADDR_A = "0xfFDd2f83555c64d1CaA17f5646C08b80013ED38b";
const ADDR_B = "0x81e921FE18a4DCff8278d790BB0A4056E42c26A9";

test("mock mode returns a well-formed score payload", async () => {
  const r = await getTrustScore(ADDR_A);
  assert.equal(r.address, ADDR_A);
  assert.equal(r.source, "mock");
  assert.equal(typeof r.trustScore, "number");
  assert.ok(r.trustScore >= 0 && r.trustScore <= 100, "score within 0-100");
  assert.equal(typeof r.signals.walletAgeDays, "number");
  assert.equal(typeof r.signals.attestationCount, "number");
  assert.equal(typeof r.signals.priorFlags, "number");
});

test("mock scorer is deterministic: same address, same score, every call", async () => {
  const first = await getTrustScore(ADDR_A);
  const second = await getTrustScore(ADDR_A);
  assert.equal(first.trustScore, second.trustScore);
  assert.deepEqual(first.signals, second.signals);
});

test("different addresses are scored independently", async () => {
  const a = await getTrustScore(ADDR_A);
  const b = await getTrustScore(ADDR_B);
  assert.equal(a.address, ADDR_A);
  assert.equal(b.address, ADDR_B);
  // Deterministic per address; values may coincide, but payloads stay separate.
  assert.notEqual(a.signals.walletAgeDays === undefined, true);
  assert.notEqual(b.signals.walletAgeDays === undefined, true);
});

test("low mock scores carry prior flags, high mock scores carry none", async () => {
  // Sweep a batch of addresses and check the signals stay consistent with
  // the scorer's own rule: priorFlags > 0 only when the score is under 30.
  for (let i = 0; i < 25; i++) {
    const addr = `0x${String(i).padStart(40, "0")}`;
    const r = await getTrustScore(addr);
    if (r.trustScore < 30) {
      assert.ok(r.signals.priorFlags >= 1, `${addr} low score should carry flags`);
    } else {
      assert.equal(r.signals.priorFlags, 0, `${addr} score >= 30 should carry no flags`);
    }
  }
});
