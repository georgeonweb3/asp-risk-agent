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

## Next steps toward ERC-8004

The natural extension: register this agent's delegation scope via ERC-8004
so a wallet owner can grant it *bounded* authority (max amount, max
frequency, specific asset) to act autonomously on their behalf — rather
than a human approving every "approve" decision. This is the piece that
would set the submission apart most for "innovation" — flag it in your
demo narration even if you don't fully implement it before the deadline.

## Submission checklist (per X Layer / OKX.AI thread)

1. Build ✅ (this repo)
2. List at okx.ai/tutorial/asp
3. Submit Google form before **Jul 17, 00:00 UTC**
4. Post demo on X with **#okxai**
5. Register at web3.okx.com/xlayer/build-x...
