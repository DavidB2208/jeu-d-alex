export const SAVE_KEY = "respire_ou_creve_save_v9_upgrades_rich";
const SAVE_VERSION = 1;

export function makeRunState(generatorDefs = []) {
  return {
    hp: 90,
    maxHpBase: 100,
    souffle: 0,
    lifetimeSouffle: 0,
    totalClicks: 0,
    timeAlive: 0,
    combo: 0,
    bestHp: 90,

    clickHpBase: 2.6,
    clickSouffleBase: 1.1,
    clickMult: 1,
    critChance: 0,
    critMult: 1.5,

    basePassiveSouffle: 0.18,
    passiveSouffleFlat: 0,
    passiveMult: 1,
    passiveHpFromSouffleMult: 1,
    flatHpRegen: 0,

    baseDrain: 2,
    flatDrainReduction: 0,
    asthmaIntensity: 0,
    asthmaGrowthRate: 0.055,
    asthmaImpactMult: 1,

    eventMalusMult: 1,
    crisisDurationMult: 1,
    crisisStability: 0,
    pollutionProtection: 0,

    ventolinePower: 1,
    ventolineCooldownMult: 1,
    ventolineTolerance: 0,
    ventolineCooldown: 0,

    defibCharges: 0,
    startingDefib: 0,
    defibHealMult: 1,
    defibRecoveryMult: 0,

    walkRewardMult: 1,
    walkPenaltyMult: 1,
    runRewardMult: 1,
    runPenaltyMult: 1,
    smokePenaltyMult: 1,

    genCostMult: 1,
    startSouffle: 0,
    lowHpClickBonus: 0,

    walkCooldown: 0,
    runCooldown: 0,
    smokeCooldown: 0,

    generators: Object.fromEntries(generatorDefs.map(g => [g.id, 0])),
    purchasedUpgrades: [],
    activeEffects: []
  };
}

export function makeState(generatorDefs = []) {
  return {
    saveVersion: SAVE_VERSION,
    unlocked: [],
    dead: false,
    run: makeRunState(generatorDefs)
  };
}

function migrateSave(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const migrated = { ...parsed };
  const fromVersion = Number.isFinite(migrated.saveVersion) ? migrated.saveVersion : 0;

  if (fromVersion < 1) {
    migrated.saveVersion = 1;
  }

  return migrated;
}

export function loadState(generatorDefs = []) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return makeState(generatorDefs);

    const parsed = migrateSave(JSON.parse(raw));
    if (!parsed) return makeState(generatorDefs);

    const s = makeState(generatorDefs);
    s.unlocked = Array.isArray(parsed.unlocked) ? parsed.unlocked : [];
    s.dead = false;
    s.saveVersion = Number.isFinite(parsed.saveVersion) ? parsed.saveVersion : SAVE_VERSION;
    s.run = Object.assign(makeRunState(generatorDefs), parsed.run || {});
    s.run.generators = Object.assign(
      makeRunState(generatorDefs).generators,
      parsed.run?.generators || {}
    );
    s.run.purchasedUpgrades = Array.isArray(parsed.run?.purchasedUpgrades) ? parsed.run.purchasedUpgrades : [];
    s.run.activeEffects = [];
    return s;
  } catch (e) {
    console.warn("Save invalid", e);
    return makeState(generatorDefs);
  }
}

export function saveState(state) {
  const serializable = {
    saveVersion: SAVE_VERSION,
    unlocked: state.unlocked,
    run: Object.assign({}, state.run, { activeEffects: [] })
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(serializable));
}

export function hardReset(generatorDefs = []) {
  localStorage.removeItem(SAVE_KEY);
  const state = makeState(generatorDefs);
  state.run.souffle = state.run.startSouffle;
  return state;
}

export function resetRun(state, generatorDefs = []) {
  const unlocked = state.unlocked.slice();
  const startSouffle = state.run.startSouffle;
  const startingDefib = state.run.startingDefib;

  const nextState = makeState(generatorDefs);
  nextState.unlocked = unlocked;
  nextState.run.souffle = startSouffle;
  nextState.run.defibCharges = startingDefib;
  nextState.dead = false;
  return nextState;
}
