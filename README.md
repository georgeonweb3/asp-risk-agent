# ASP Risk Agent — BasePulse Counterparty Screening

Autonomous agent for the OKX.AI Genesis Hackathon. Before a wallet sends
funds or delegates to a counterparty, this ASP checks their BasePulse trust
score in real time and blocks, flags, or auto-approves the transaction.

## Category fit
Targets **Finance Copilot** or **Software Utility** — real-time risk
screening as a callable agent service, not a passive dashboard.

## Setup (Termux/Android)

```bash
cd asp-risk-agent
npm install
cp .env.example .env
npm start
```

Leave `MOCK_MODE=true` in `.env` for now — this uses a deterministic mock
scorer so you can build/demo the flow before wiring in your live BasePulse
endpoint and CDP wallet credentials.

## Run the demo

In a second Termux session while the server is running:

```bash
npm run demo
```

This hits three addresses that land in the block / flag / approve bands and
prints a clean, narratable log — record your terminal (or screen-record the
Termux session) for the #okxai submission video.

## Wiring in the real BasePulse API

Edit `src/basepulseClient.js` — replace the mock branch's usage with your
live `BASEPULSE_API_URL` response shape. Set `MOCK_MODE=false` in `.env`
once confirmed.

## Wiring in the real CDP wallet

Edit `src/cdpWallet.js`'s `executeReal()` with your existing CDP SDK wallet
init from your Termux agent-wallet build (Coinbase CDP SDK). Set
`CDP_API_KEY_NAME` / `CDP_API_KEY_PRIVATE_KEY` in `.env`.

## ERC-8004: on-chain agent identity

**Correction from earlier planning:** ERC-8004 is not a delegation or
fund-authority standard. It does not let this agent auto-execute
transactions on a wallet's behalf — that's a separate mechanism (ERC-4337
session keys / account abstraction). What ERC-8004 actually provides is a
verifiable, discoverable **on-chain identity** for the agent itself, via
three registries (Identity, Reputation, Validation).

This repo registers the risk agent's identity via the real, deployed
ERC-8004 Identity Registry on Base mainnet (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`).
Once registered, every `/check` response includes the agent's `agentId`
and `agentRegistry` — meaning each decision is attributable to a specific,
publicly verifiable on-chain agent, checkable by anyone on Basescan.

### One-time registration

```bash
npm install
```

1. Create a **small, dedicated** wallet (not your main Rainbow wallet) and
   fund it with a few cents of Base ETH for gas.
2. Add its private key to `.env` as `AGENT_REGISTRAR_PRIVATE_KEY`.
3. Run:
```bash
npm run register-agent
```
4. Copy the printed `agentId` into `.env` as `AGENT_ID`.
5. Restart the server (`npm start`). Every `/check` response now includes
   your agent's on-chain identity.

**Security note:** never commit `AGENT_REGISTRAR_PRIVATE_KEY` or paste it
in chat/screenshots. It's already excluded via `.gitignore` since it only
ever lives in your local `.env`.

### What's genuinely NOT built (and why)

The Reputation Registry lets *clients* rate an agent after a completed
interaction — but the spec explicitly blocks an agent from giving feedback
to itself. So there's no "agent logs its own decision as reputation" path;
that would just revert on-chain. A real future integration: once someone
(e.g., a P2P app owner) actually uses this agent's decision and it holds up
or fails, *they* could call `giveFeedback()` on the agent's `agentId` —
that's a genuine roadmap item, not something faked here.

## Next steps

- Wire `executeReal()` in `src/cdpWallet.js` to a real CDP wallet once
  ready to let "approve" decisions actually execute (separate from the
  ERC-8004 identity work above — this would use ERC-4337 session keys or
  CDP wallet spend limits, not ERC-8004).
- Once the agent has processed real decisions, invite counterparties to
  submit `giveFeedback()` against its `agentId` to start building genuine
  on-chain reputation.

## Submission checklist (per X Layer / OKX.AI thread)

1. Build ✅ (this repo)
2. List at okx.ai/tutorial/asp
3. Submit Google form before **Jul 17, 00:00 UTC**
4. Post demo on X with **#okxai**
5. Register at web3.okx.com/xlayer/build-x...
