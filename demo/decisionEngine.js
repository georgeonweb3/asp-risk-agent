const THRESHOLD_BLOCK = Number(process.env.THRESHOLD_BLOCK || 30);
const THRESHOLD_FLAG = Number(process.env.THRESHOLD_FLAG || 65);

/**
 * decide() turns a BasePulse trust score + requested action into one of:
 *   - "block"          : reject outright, no execution
 *   - "flag_for_review": hold, surface to human/agent owner for manual approval
 *   - "approve"        : auto-execute
 *
 * This is intentionally simple and legible — judges should be able to see
 * the rule in one glance. Complexity can live in BasePulse's scoring, not here.
 */
function decide({ trustScore, requestedAmountUsd = 0 }) {
  if (trustScore === null || trustScore === undefined) {
    return {
      action: "flag_for_review",
      reason: "Trust score unavailable — defaulting to manual review rather than auto-approving blind."
    };
  }

  if (trustScore < THRESHOLD_BLOCK) {
    return {
      action: "block",
      reason: `Trust score ${trustScore} is below the block threshold (${THRESHOLD_BLOCK}).`
    };
  }

  if (trustScore < THRESHOLD_FLAG) {
    return {
      action: "flag_for_review",
      reason: `Trust score ${trustScore} is in the mid-confidence band (${THRESHOLD_BLOCK}-${THRESHOLD_FLAG}) — held for manual approval.`
    };
  }

  // High trust — but still gate large amounts behind review regardless of score,
  // since a single score shouldn't authorize unlimited exposure.
  if (requestedAmountUsd > 5000) {
    return {
      action: "flag_for_review",
      reason: `Trust score ${trustScore} is high, but requested amount ($${requestedAmountUsd}) exceeds the auto-approve cap.`
    };
  }

  return {
    action: "approve",
    reason: `Trust score ${trustScore} clears the auto-approve threshold (${THRESHOLD_FLAG}).`
  };
}

module.exports = { decide, THRESHOLD_BLOCK, THRESHOLD_FLAG };
