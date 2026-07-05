/**
 * scripts/registerAgent.js
 *
 * ONE-TIME SCRIPT. Registers this risk agent as a verifiable on-chain
 * identity via the real ERC-8004 Identity Registry on Base mainnet.
 *
 * IMPORTANT — what this actually is, and isn't:
 * ERC-8004 is NOT a delegation/mandate standard. It does not grant this
 * agent spending authority over any wallet. It gives the agent a portable,
 * on-chain, ERC-721-based identity that anyone can verify — this script
 * mints that identity and attaches a registration file describing the
 * agent. Real fund delegation (letting the agent auto-execute approved
 * transactions) is a separate concern (ERC-4337 session keys / CDP wallet
 * spend limits), not something ERC-8004 provides.
 *
 * Two-step flow, because the registration file needs the real agentId,
 * which only exists after registering:
 *   1. register() — mints the agent NFT, returns agentId
 *   2. setAgentURI(agentId, dataUri) — attaches the registration file,
 *      self-referencing the agentId we just got back
 *
 * SECURITY: this uses a private key from your environment to sign a real
 * on-chain transaction (costs a small amount of Base ETH for gas).
 *   - Use a small dedicated wallet for this, NOT your main Rainbow wallet's
 *     primary key, in case anything in this script or your env ever leaks.
 *   - Never paste your private key into chat, screenshots, or commits.
 *   - Set it only in your local .env, which is already in .gitignore.
 *
 * Usage:
 *   1. Add to .env:
 *        AGENT_REGISTRAR_PRIVATE_KEY=0x...   (small wallet, funded with a
 *                                              few cents of Base ETH for gas)
 *   2. node scripts/registerAgent.js
 *
 * If register() already succeeded in a previous run but setAgentURI()
 * failed afterward, don't re-run from scratch (that mints a second,
 * redundant agent). Instead add to .env:
 *        RESUME_REGISTER_TX=0x...   (the tx hash register() already sent)
 * and re-run — this skips straight to decoding that tx's real agentId and
 * attaching the registration file.
 */
require("dotenv").config();
const {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  parseEventLogs
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { base } = require("viem/chains");

const IDENTITY_REGISTRY_ADDRESS = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

// Minimal ABI — only the functions this script actually calls.
const IDENTITY_REGISTRY_ABI = parseAbi([
  "function register() external returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId, string calldata newURI) external",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)"
]);

function buildRegistrationFile(agentId) {
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "BasePulse Counterparty-Risk Agent",
    description:
      "Screens Base wallet addresses against BasePulse trust scores before a transaction executes. Returns block / flag-for-review / approve decisions based on on-chain wallet age, activity, contract diversity, and EAS attestations.",
    image: "",
    services: [
      {
        name: "web",
        endpoint: "https://github.com/georgeonweb3/asp-risk-agent"
      }
    ],
    x402Support: false,
    active: true,
    registrations: [
      {
        agentId: Number(agentId),
        agentRegistry: `eip155:8453:${IDENTITY_REGISTRY_ADDRESS}`
      }
    ],
    supportedTrust: ["reputation"]
  };
}

function toDataUri(jsonObject) {
  const json = JSON.stringify(jsonObject);
  const base64 = Buffer.from(json, "utf-8").toString("base64");
  return `data:application/json;base64,${base64}`;
}

async function main() {
  const privateKey = process.env.AGENT_REGISTRAR_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "Missing AGENT_REGISTRAR_PRIVATE_KEY in .env — see the usage comment at the top of this file."
    );
  }

  const account = privateKeyToAccount(privateKey);
  const transport = http("https://mainnet.base.org");

  const publicClient = createPublicClient({ chain: base, transport });
  const walletClient = createWalletClient({ account, chain: base, transport });

  console.log(`Registering agent identity from wallet: ${account.address}`);
  console.log(`Target registry (Base mainnet): ${IDENTITY_REGISTRY_ADDRESS}\n`);

  // Resume support: if a previous run already called register() successfully
  // (e.g. it failed on the setAgentURI step afterward, like a bad decode),
  // set RESUME_REGISTER_TX in .env to that tx hash instead of minting a
  // second, redundant agent identity and spending gas twice.
  let registerHash = process.env.RESUME_REGISTER_TX;
  let registerReceipt;

  if (registerHash) {
    console.log(`Resuming from existing register() tx: ${registerHash}`);
    registerReceipt = await publicClient.getTransactionReceipt({ hash: registerHash });
  } else {
    console.log("Step 1/2: calling register()...");
    registerHash = await walletClient.writeContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "register",
      args: []
    });
    console.log(`  tx sent: ${registerHash}`);

    registerReceipt = await publicClient.waitForTransactionReceipt({
      hash: registerHash
    });
  }

  // Decode properly using the ABI, filtered to the "Registered" event
  // specifically — NOT just "the first log from this contract address".
  // ERC-721 mints typically emit a Transfer event before the custom
  // Registered event, and naively grabbing the first log's topics[1]
  // picks up Transfer's "from" address (0x0...0) instead of the real
  // agentId. This decodes every log against the full ABI and only keeps
  // ones that actually match "Registered".
  const decodedLogs = parseEventLogs({
    abi: IDENTITY_REGISTRY_ABI,
    logs: registerReceipt.logs,
    eventName: "Registered"
  });

  if (decodedLogs.length === 0) {
    throw new Error(
      "Could not find a Registered event in the transaction receipt. " +
        "Check the tx on Basescan manually: https://basescan.org/tx/" +
        registerHash
    );
  }

  const agentId = decodedLogs[0].args.agentId;
  console.log(`  Registered! agentId = ${agentId.toString()}\n`);

  // Step 2: build the registration file (now that we know agentId) and
  // attach it as the agentURI.
  console.log("Step 2/2: building registration file and calling setAgentURI()...");
  const registrationFile = buildRegistrationFile(agentId);
  const dataUri = toDataUri(registrationFile);

  const setUriHash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "setAgentURI",
    args: [agentId, dataUri]
  });
  console.log(`  tx sent: ${setUriHash}`);
  await publicClient.waitForTransactionReceipt({ hash: setUriHash });

  console.log("\n=== Registration complete ===");
  console.log(`agentId: ${agentId.toString()}`);
  console.log(`agentRegistry: eip155:8453:${IDENTITY_REGISTRY_ADDRESS}`);
  console.log(`View on Basescan: https://basescan.org/tx/${setUriHash}`);
  console.log(
    "\nSave the agentId above — you'll want to reference it in your OKX.AI submission and README, and set it as AGENT_ID in your .env."
  );
}

main().catch((err) => {
  console.error("Registration failed:", err.message);
  process.exit(1);
});
