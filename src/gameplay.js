export function getComboMultiplier(runState) {
  return 1 + Math.min(runState.combo, 20) * 0.04;
}

export function getDerived(runState, generatorDefs = []) {
  const effectTotals = {
    drainAdd: 0,
    drainMul: 1,
    clickHpMult: 1,
    clickSouffleMult: 1,
    passiveHpMult: 1,
    passiveSouffleMult: 1,
    flatHpRegen: 0
  };

  for (const effect of runState.activeEffects) {
    effectTotals.drainAdd += effect.drainAdd || 0;
    effectTotals.drainMul *= effect.drainMul || 1;
    effectTotals.clickHpMult *= effect.clickHpMult || 1;
    effectTotals.clickSouffleMult *= effect.clickSouffleMult || 1;
    effectTotals.passiveHpMult *= effect.passiveHpMult || 1;
    effectTotals.passiveSouffleMult *= effect.passiveSouffleMult || 1;
    effectTotals.flatHpRegen += effect.flatHpRegen || 0;
  }

  let passiveSouffleBase = runState.basePassiveSouffle + runState.passiveSouffleFlat + (runState.combo * 0.012);
  let passiveHpBase = 0;
  for (const generator of generatorDefs) {
    const owned = runState.generators[generator.id] || 0;
    passiveSouffleBase += owned * generator.souffle;
    passiveHpBase += owned * generator.hp;
  }

  const comboMultiplier = getComboMultiplier(runState);
  const maxHp = runState.maxHpBase;

  let clickHp = runState.clickHpBase * runState.clickMult * comboMultiplier * effectTotals.clickHpMult;
  if (runState.lowHpClickBonus > 0 && runState.hp <= maxHp * 0.25) {
    clickHp *= (1 + runState.lowHpClickBonus);
  }

  const clickSouffle = runState.clickSouffleBase * runState.clickMult * comboMultiplier * effectTotals.clickSouffleMult;
  const passiveSouffle = passiveSouffleBase * runState.passiveMult * effectTotals.passiveSouffleMult;
  const passiveHpFromSouffle = passiveSouffle * 0.08 * runState.passiveHpFromSouffleMult;
  const passiveHp = passiveHpBase * runState.passiveMult * effectTotals.passiveHpMult
    + runState.flatHpRegen
    + effectTotals.flatHpRegen
    + passiveHpFromSouffle;

  const asthmaDrain = runState.asthmaIntensity * runState.asthmaImpactMult;
  const drain = Math.max(
    0,
    ((runState.baseDrain + asthmaDrain + effectTotals.drainAdd) * effectTotals.drainMul) - runState.flatDrainReduction
  );

  return { clickHp, clickSouffle, passiveSouffle, passiveHp, drain, asthmaDrain };
}

function softenNegativeMultiplier(value, crisisStability) {
  if (value >= 1) return value;
  return value + (1 - value) * crisisStability;
}

export function applyEffect({ activeEffects, effect, runState, nowMs }) {
  const adjusted = { ...effect };

  if (adjusted.negative) {
    adjusted.duration = adjusted.duration * runState.crisisDurationMult;
    if (adjusted.drainAdd) adjusted.drainAdd *= runState.eventMalusMult;
    if (adjusted.clickHpMult) adjusted.clickHpMult = softenNegativeMultiplier(adjusted.clickHpMult, runState.crisisStability);
    if (adjusted.clickSouffleMult) adjusted.clickSouffleMult = softenNegativeMultiplier(adjusted.clickSouffleMult, runState.crisisStability);
    if (adjusted.passiveSouffleMult) adjusted.passiveSouffleMult = softenNegativeMultiplier(adjusted.passiveSouffleMult, runState.crisisStability);
    if (adjusted.passiveHpMult) adjusted.passiveHpMult = softenNegativeMultiplier(adjusted.passiveHpMult, runState.crisisStability);
  }

  adjusted.endsAt = nowMs + adjusted.duration * 1000;

  const nextEffects = activeEffects.slice();
  const index = nextEffects.findIndex(current => current.id === adjusted.id);
  if (index >= 0) nextEffects[index] = adjusted;
  else nextEffects.push(adjusted);

  return nextEffects;
}

export function removeExpiredEffects(activeEffects, nowMs) {
  return activeEffects.filter(effect => effect.endsAt > nowMs);
}

export function tryDefibOrDie(runState) {
  const maxHp = runState.maxHpBase;
  if (runState.defibCharges > 0) {
    const restoredHp = maxHp * (0.42 * runState.defibHealMult);
    const postShockPenalty = 0.85 * (1 - runState.defibRecoveryMult);

    return {
      outcome: "defib",
      restoredHp,
      nextRunState: {
        ...runState,
        defibCharges: runState.defibCharges - 1,
        hp: Math.min(maxHp, restoredHp)
      },
      effect: {
        id: "defib_shock",
        name: "Récupération post-choc",
        duration: 9,
        drainAdd: postShockPenalty,
        clickHpMult: 0.88,
        negative: true
      }
    };
  }

  return {
    outcome: "death",
    nextRunState: {
      ...runState,
      hp: 0
    }
  };
}

export function triggerRandomEvent(runState, rng = Math.random) {
  const pollutionDrain = 1.55 * (1 - runState.pollutionProtection);

  const events = [
    {
      id: "asthma_crisis",
      effects: [{ id: "asthma_crisis", name: "Crise d’asthme", duration: 8, drainAdd: 2.2, clickHpMult: 0.72, passiveSouffleMult: 0.84, negative: true }],
      hurt: 10,
      notice: { title: "Crise d’asthme", body: "La perte de PV s’emballe.", tone: "bad" },
      flash: "red"
    },
    {
      id: "adrenaline",
      effects: [{ id: "adrenaline", name: "Adrénaline", duration: 10, clickHpMult: 1.6, clickSouffleMult: 1.4, passiveSouffleMult: 1.2 }],
      notice: { title: "Montée d’adrénaline", body: "Les clics rapportent beaucoup plus.", tone: "good" },
      flash: "blue"
    },
    {
      id: "clean_air",
      effects: [{ id: "clean_air", name: "Air pur", duration: 12, drainAdd: -1.25 }],
      notice: { title: "Air pur", body: "Alex respire un peu mieux.", tone: "good" }
    },
    {
      id: "pollution",
      effects: [{ id: "pollution", name: "Pollution", duration: 12, drainAdd: pollutionDrain, negative: true }],
      notice: { title: "Pollution", body: "L’air devient irrespirable.", tone: "bad" },
      flash: "red"
    },
    {
      id: "panic2",
      effects: [{ id: "panic2", name: "Panique", duration: 6, clickHpMult: 0.6, negative: true }],
      notice: { title: "Panique", body: "Les clics deviennent moins efficaces.", tone: "bad" }
    },
    {
      id: "cough",
      hurt: 14,
      notice: { title: "Toux violente", body: "Alex perd brutalement des PV.", tone: "bad" },
      flash: "red"
    },
    {
      id: "med_help",
      heal: 20,
      effects: [{ id: "med_help", name: "Aide médicale", duration: 10, passiveHpMult: 1.35, passiveSouffleMult: 1.18 }],
      notice: { title: "Aide médicale", body: "Un coup de main providentiel.", tone: "good" },
      flash: "blue"
    },
    {
      id: "relapse",
      hurt: 18,
      effects: [{ id: "relapse", name: "Rechute", duration: 10, drainAdd: 0.8, negative: true }],
      notice: { title: "Rechute", body: "Le corps d’Alex cède encore.", tone: "bad" },
      flash: "red"
    }
  ];

  const eventIndex = Math.min(events.length - 1, Math.floor(rng() * events.length));
  return events[eventIndex];
}
