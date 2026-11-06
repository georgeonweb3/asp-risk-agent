const { test } = require("node:test");
const assert = require("node:assert/strict");

// WALLET_MOCK_MODE defaults to true unless explicitly "false"; pin it so an
// approve in this suite can never attempt a real execution.
process.env.WALLET_MOCK_MODE = "true";

const { executeAction } = require("../src/cdpWallet");

const BASE = { address: "0xfFDd2f83555c64d1CaA17f5646C08b80013ED38b", amountUsd: 100, reason: "test" };

test("block never executes", async () => {
  const r = await executeAction({ ...BASE, action: "block" });
  assert.equal(r.action, "block");
  assert.equal(r.executed, false);
  assert.ok(r.timestamp, "result carries a timestamp");
});

test("flag_for_review never executes and explains the hold", async () => {
  const r = await executeAction({ ...BASE, action: "flag_for_review" });
  assert.equal(r.executed, false);
  assert.match(r.note, /manual approval/i);
});

test("approve in wallet mock mode simulates execution, sends nothing", async () => {
  const r = await executeAction({ ...BASE, action: "approve" });
  assert.equal(r.executed, true);
  assert.match(r.note, /simulated execution/i);
});

test("unknown action throws instead of silently passing", async () => {
  await assert.rejects(
    () => executeAction({ ...BASE, action: "send_it_all" }),
    /Unknown action/
  );
});
