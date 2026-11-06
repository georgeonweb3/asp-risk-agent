const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

// Integration test: boot the real server in mock mode (offline, no keys,
// no funds — the same conditions the project is graded under) and exercise
// the /check contract end to end.
const PORT = 4199;
const BASE = `http://127.0.0.1:${PORT}`;
let child;

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return await res.json();
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("server did not come up in time");
}

before(async () => {
  child = spawn(process.execPath, [path.join(__dirname, "..", "src", "server.js")], {
    env: {
      ...process.env,
      PORT: String(PORT),
      MOCK_MODE: "true",
      WALLET_MOCK_MODE: "true",
      THRESHOLD_BLOCK: "30",
      THRESHOLD_FLAG: "65",
      AGENT_ID: ""
    },
    stdio: "ignore"
  });
  await waitForHealth();
});

after(() => {
  if (child) child.kill();
});

test("GET /health reports ok and mock mode on", async () => {
  const res = await fetch(`${BASE}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.mockMode, true);
});

test("POST /check without an address is a 400", async () => {
  const res = await fetch(`${BASE}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountUsd: 100 })
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /address/i);
});

test("POST /check with a non-string address is a 400", async () => {
  const res = await fetch(`${BASE}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: 12345, amountUsd: 100 })
  });
  assert.equal(res.status, 400);
});

async function postCheck(payload) {
  const res = await fetch(`${BASE}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 200);
  return res.json();
}

// The mock scorer is deterministic, so for any address the decision must
// agree with the returned trust score under the 30/65 thresholds.
function expectedDecision(trustScore, amountUsd) {
  if (trustScore === null || trustScore === undefined) return "flag_for_review";
  if (trustScore < 30) return "block";
  if (trustScore < 65) return "flag_for_review";
  if (amountUsd > 5000) return "flag_for_review";
  return "approve";
}

test("POST /check returns a decision consistent with its trust score", async () => {
  const addresses = [
    "0xfFDd2f83555c64d1CaA17f5646C08b80013ED38b",
    "0x27Ee5935bb21BABA65e760fdd82EA4bDD2375423",
    "0x81e921FE18a4DCff8278d790BB0A4056E42c26A9",
    "0x19449A95Ff4DFC9b0DE7aEE4366Df7B8B8f852DC"
  ];
  for (const address of addresses) {
    const body = await postCheck({ address, amountUsd: 500 });
    assert.equal(body.address, address);
    assert.equal(body.scoreSource, "mock");
    assert.equal(typeof body.trustScore, "number");
    assert.equal(body.decision, expectedDecision(body.trustScore, 500), `decision for ${address}`);
    assert.equal(typeof body.reason, "string");
    assert.ok(body.reason.length > 0);
    assert.equal(typeof body.execution.executed, "boolean");
    if (body.decision !== "approve") {
      assert.equal(body.execution.executed, false, "only approve may execute");
    }
    assert.ok("agent" in body, "response advertises agent identity block");
  }
});

test("POST /check is deterministic in mock mode", async () => {
  const payload = { address: "0x27Ee5935bb21BABA65e760fdd82EA4bDD2375423", amountUsd: 800 };
  const first = await postCheck(payload);
  const second = await postCheck(payload);
  assert.equal(first.trustScore, second.trustScore);
  assert.equal(first.decision, second.decision);
});

test("a large amount is never auto-approved, whatever the score", async () => {
  // Sweep until we hit a high-scoring address, then re-check it with an
  // amount above the auto-approve cap.
  for (let i = 0; i < 40; i++) {
    const address = `0x${String(1000 + i).padStart(40, "0")}`;
    const probe = await postCheck({ address, amountUsd: 10 });
    if (probe.trustScore >= 65) {
      const big = await postCheck({ address, amountUsd: 6000 });
      assert.equal(big.decision, "flag_for_review");
      assert.equal(big.execution.executed, false);
      return;
    }
  }
  assert.fail("no high-scoring address found in sweep — mock scorer distribution changed?");
});
