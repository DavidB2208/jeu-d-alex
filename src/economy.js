export const BUY_BLOCK_REASONS = Object.freeze({
  DEAD: "dead",
  INSUFFICIENT: "insufficient",
  ALREADY_BOUGHT: "already_bought"
});

export function costForGenerator(state, def) {
  const owned = state.run.generators[def.id] || 0;
  return Math.floor(def.baseCost * state.run.genCostMult * Math.pow(1.16, owned));
}

export function costForUpgrade(upgradeDef) {
  return upgradeDef.cost;
}

function makeBuyResult(ok, reason, cost) {
  return { ok, reason, cost };
}

export function canBuyGenerator(state, def) {
  const cost = costForGenerator(state, def);
  if (state.dead) return makeBuyResult(false, BUY_BLOCK_REASONS.DEAD, cost);
  if (state.run.souffle < cost) return makeBuyResult(false, BUY_BLOCK_REASONS.INSUFFICIENT, cost);
  return makeBuyResult(true, null, cost);
}

export function canBuyUpgrade(state, upgradeDef) {
  const cost = costForUpgrade(upgradeDef);
  if (state.run.purchasedUpgrades.includes(upgradeDef.id)) {
    return makeBuyResult(false, BUY_BLOCK_REASONS.ALREADY_BOUGHT, cost);
  }
  if (state.dead) return makeBuyResult(false, BUY_BLOCK_REASONS.DEAD, cost);
  if (state.run.souffle < cost) return makeBuyResult(false, BUY_BLOCK_REASONS.INSUFFICIENT, cost);
  return makeBuyResult(true, null, cost);
}
