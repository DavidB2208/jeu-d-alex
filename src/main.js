import { loadState, saveState, resetRun, hardReset } from "./state.js";
import { BUY_BLOCK_REASONS, canBuyGenerator, canBuyUpgrade } from "./economy.js";
import {
  applyEffect as computeAppliedEffect,
  getComboMultiplier,
  getDerived,
  removeExpiredEffects as computeRemainingEffects,
  triggerRandomEvent as pickRandomEvent,
  tryDefibOrDie as resolveDefibOrDeath
} from "./gameplay.js";
import { renderHud } from "./ui/hud.js";
import { renderShop } from "./ui/shop.js";
import { renderUpgrades } from "./ui/upgrades.js";
import { renderEffects } from "./ui/effects.js";

function initGame() {
  const generatorDefs = [
    { id: "respire", name: "Respiration contrôlée", baseCost: 15, souffle: 0.8, hp: 0.10, desc: "Routine respiratoire lente mais régulière." },
    { id: "auto_vento", name: "Ventoline automatique", baseCost: 70, souffle: 2.0, hp: 0.26, desc: "Micro-doseurs qui aident Alex à tenir." },
    { id: "machine", name: "Machine respiratoire", baseCost: 220, souffle: 5.4, hp: 0.55, desc: "Assistance mécanique rudimentaire." },
    { id: "medical", name: "Assistance médicale", baseCost: 760, souffle: 12.5, hp: 1.05, desc: "Aide clinique improvisée dans l’ombre." },
    { id: "passif", name: "Système respiratoire passif", baseCost: 2500, souffle: 28, hp: 2.5, desc: "Stabilise la run sans cliquer." },
    { id: "lab", name: "Laboratoire pulmonaire", baseCost: 8200, souffle: 76, hp: 6.3, desc: "Tests obscurs, efficacité certaine." },
    { id: "implant", name: "Implant respiratoire", baseCost: 25000, souffle: 195, hp: 15, desc: "Transcende la fragilité d’Alex." }
  ];

  const upgradeCategories = [
    { id: "click", name: "Améliorations de clic" },
    { id: "passive", name: "Améliorations de souffle passif" },
    { id: "survival", name: "Améliorations de survie" },
    { id: "asthma", name: "Améliorations contre l’asthme" },
    { id: "medical", name: "Ventoline & défibrillateur" },
    { id: "risk", name: "Améliorations de risque" },
    { id: "progression", name: "Améliorations de progression" }
  ];

  const upgradeDefs = [
    { id: "deep_breath", category: "click", name: "Inspiration profonde", cost: 40, desc: "+1.7 PV par clic.", apply: s => { s.clickHpBase += 1.7; } },
    { id: "strong_breath", category: "click", name: "Souffle plus puissant", cost: 70, desc: "+1.5 souffle par clic.", apply: s => { s.clickSouffleBase += 1.5; } },
    { id: "reflex", category: "click", name: "Réflexe pulmonaire", cost: 140, desc: "+12% de chance de clic critique.", apply: s => { s.critChance += 0.12; s.critMult += 1.0; } },
    { id: "manual_adrenaline", category: "click", name: "Adrénaline manuelle", cost: 280, desc: "+75% puissance de clic quand Alex est sous 25% PV.", apply: s => { s.lowHpClickBonus += 0.75; } },

    { id: "auto_breath", category: "passive", name: "Respiration autonome", cost: 55, desc: "+0.45 souffle passif/s.", apply: s => { s.passiveSouffleFlat += 0.45; } },
    { id: "routine", category: "passive", name: "Routine respiratoire", cost: 125, desc: "+25% souffle passif global.", apply: s => { s.passiveMult += 0.25; } },
    { id: "assisted_lung", category: "passive", name: "Poumon assisté", cost: 240, desc: "Le souffle passif rend plus de PV.", apply: s => { s.passiveHpFromSouffleMult += 0.35; } },
    { id: "stable_cannula", category: "passive", name: "Canule stable", cost: 520, desc: "Les crises réduisent moins l’efficacité de la run.", apply: s => { s.crisisStability += 0.20; } },

    { id: "capacity", category: "survival", name: "Capacité pulmonaire", cost: 95, desc: "+35 PV max.", apply: s => { s.maxHpBase += 35; s.hp += 20; } },
    { id: "thoracic_resistance", category: "survival", name: "Résistance thoracique", cost: 190, desc: "-0.40 perte de PV/sec.", apply: s => { s.flatDrainReduction += 0.40; } },
    { id: "effort_tolerance", category: "survival", name: "Tolérance à l’effort", cost: 420, desc: "Réduit les malus de marche et course.", apply: s => { s.walkPenaltyMult *= 0.75; s.runPenaltyMult *= 0.82; } },
    { id: "fast_recovery", category: "survival", name: "Récupération rapide", cost: 680, desc: "Ventoline plus efficace.", apply: s => { s.ventolinePower += 0.35; } },

    { id: "crisis_control", category: "asthma", name: "Contrôle de crise", cost: 260, desc: "L’asthme monte plus lentement.", apply: s => { s.asthmaGrowthRate *= 0.82; } },
    { id: "background_treatment", category: "asthma", name: "Traitement de fond", cost: 520, desc: "L’asthme pèse moins sur la perte de PV.", apply: s => { s.asthmaImpactMult *= 0.82; } },
    { id: "nebulizer", category: "asthma", name: "Nébuliseur médical", cost: 860, desc: "Les crises durent moins longtemps.", apply: s => { s.crisisDurationMult *= 0.78; } },
    { id: "air_filter", category: "asthma", name: "Filtre à air", cost: 1300, desc: "Réduit les malus de pollution et d’événements négatifs.", apply: s => { s.eventMalusMult *= 0.86; s.pollutionProtection += 0.25; } },

    { id: "concentrated_ventoline", category: "medical", name: "Ventoline concentrée", cost: 340, desc: "La Ventoline soigne davantage.", apply: s => { s.ventolinePower += 0.55; } },
    { id: "medical_reserve", category: "medical", name: "Réserve médicale", cost: 760, desc: "Réduit le cooldown de la Ventoline.", apply: s => { s.ventolineCooldownMult *= 0.78; } },
    { id: "extra_charge", category: "medical", name: "Charge supplémentaire", cost: 1150, desc: "+1 charge de défibrillateur.", apply: s => { s.defibCharges += 1; s.startingDefib += 1; } },
    { id: "post_shock_recovery", category: "medical", name: "Récupération post-choc", cost: 1800, desc: "Réduit le malus après défibrillateur.", apply: s => { s.defibRecoveryMult += 0.35; } },
    { id: "inhalation_mastery", category: "medical", name: "Inhalation maîtrisée", cost: 1450, desc: "Les stacks de ventoline montent moins vite et les rebonds sont moins durs.", apply: s => { s.ventolineStackGainMult *= 0.72; s.ventolineCrashMult *= 0.80; } },

    { id: "controlled_walk", category: "risk", name: "Marche contrôlée", cost: 210, desc: "La marche donne plus de souffle et fait moins mal.", apply: s => { s.walkRewardMult += 0.35; s.walkPenaltyMult *= 0.72; } },
    { id: "master_run", category: "risk", name: "Course maîtrisée", cost: 620, desc: "La course rapporte plus et devient moins punitive.", apply: s => { s.runRewardMult += 0.40; s.runPenaltyMult *= 0.78; } },
    { id: "weaning", category: "risk", name: "Sevrage progressif", cost: 860, desc: "Réduit le malus de cigarette.", apply: s => { s.smokePenaltyMult *= 0.70; } },
    { id: "nicotine_filter", category: "risk", name: "Filtre nicotinique", cost: 1220, desc: "Les stacks de cigarette montent moins vite et les grandes crises fument moins fort.", apply: s => { s.cigaretteStackGainMult *= 0.72; s.smokeSurgeMult *= 0.80; } },

    { id: "prepared_start", category: "progression", name: "Départ préparé", cost: 260, desc: "+60 souffle immédiatement et au début des runs suivantes.", apply: s => { s.startSouffle += 60; s.souffle += 60; } },
    { id: "buy_optimization", category: "progression", name: "Optimisation des achats", cost: 900, desc: "Les générateurs coûtent 10% moins cher.", apply: s => { s.genCostMult *= 0.90; } },
    { id: "general_stability", category: "progression", name: "Stabilité générale", cost: 1500, desc: "+15% clic, +15% passif, -0.12 perte/sec.", apply: s => { s.clickMult += 0.15; s.passiveMult += 0.15; s.flatDrainReduction += 0.12; } },
    { id: "monitoring", category: "progression", name: "Monitorage continu", cost: 2100, desc: "Le niveau de crise redescend plus vite après les moments de panique.", apply: s => { s.crisisDecayMult *= 1.35; } }
  ];

  const achievements = [
    { id: "first_click", name: "Premier souffle", check: s => s.totalClicks >= 1 },
    { id: "fifty_clicks", name: "50 respirations", check: s => s.totalClicks >= 50 },
    { id: "souffle_500", name: "500 souffle", check: s => s.lifetimeSouffle >= 500 },
    { id: "first_machine", name: "Machine en marche", check: s => s.generators.machine >= 1 },
    { id: "mods_5", name: "Corps modifié", check: s => s.purchasedUpgrades.length >= 5 },
    { id: "survivor", name: "Run tenace", check: s => s.timeAlive >= 180 }
  ];

  injectUiEnhancementStyles();
  ensureHudEnhancements();

  const qs = sel => document.querySelector(sel);
  const qsa = sel => [...document.querySelectorAll(sel)];

  const els = {
    hpText: qs("#hpText"),
    maxHpText: qs("#maxHpText"),
    hpFill: qs("#hpFill"),
    drainText: qs("#drainText"),
    souffleText: qs("#souffleText"),
    clickGainText: qs("#clickGainText"),
    passiveText: qs("#passiveText"),
    stateText: qs("#stateText"),
    asthmaText: qs("#asthmaText"),
    comboText: qs("#comboText"),
    riskText: qs("#riskText"),
    crisisText: qs("#crisisText"),
    asthmaFill: qs("#asthmaFill"),
    comboFill: qs("#comboFill"),
    riskFill: qs("#riskFill"),
    crisisFill: qs("#crisisFill"),
    stageTopbar: qs("#stageTopbar"),
    stageMessage: qs("#stageMessage"),
    effectsList: qs("#effectsList"),
    achievementList: qs("#achievementList"),
    shopList: qs("#shopList"),
    upgradeList: qs("#upgradeList"),
    notifications: qs("#notifications"),
    spawnLayer: qs("#spawnLayer"),
    deathOverlay: qs("#deathOverlay"),
    ventolineInfo: qs("#ventolineInfo"),
    defibInfo: qs("#defibInfo"),
    flashRed: qs("#flashRed"),
    flashBlue: qs("#flashBlue"),
    hpPanel: qs("#hpPanel"),
    ventolineBtn: qs("#ventolineBtn"),
    walkBtn: qs("#walkBtn"),
    runBtn: qs("#runBtn"),
    smokeBtn: qs("#smokeBtn"),
    defibBtn: qs("#defibBtn")
  };

  let state = loadState(generatorDefs);
  ensureRunDefaults(state.run);
  let last = performance.now();
  let nextEventAt = performance.now() + 16000;

  const dirty = { hud: true, effects: true, shop: true, upgrades: true, achievements: true };
  const markDirty = (...keys) => keys.forEach(key => { dirty[key] = true; });

  const fmt = value => Math.abs(value) >= 1000000
    ? `${(value / 1000000).toFixed(2).replace(/\.00$/, "")}M`
    : Math.abs(value) >= 1000
      ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : Number(value).toFixed(value < 10 ? 1 : 0).replace(/\.0$/, "");

  const getMaxHp = () => state.run.maxHpBase;
  const getDefibPrice = () => 260 + state.run.defibCharges * 180;

  function injectUiEnhancementStyles() {
    if (document.getElementById("dynamic-hud-style")) return;
    const style = document.createElement("style");
    style.id = "dynamic-hud-style";
    style.textContent = `
      .hud-bar{
        margin-top:8px;height:10px;border-radius:999px;overflow:hidden;
        background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.07)
      }
      .hud-fill{height:100%;width:0%;transition:width .18s ease, filter .18s ease}
      .gold-fill{background:linear-gradient(90deg,#846512,#d9b983,#ffe1a3)}
      .blue-fill{background:linear-gradient(90deg,#0d4965,#48c6ff,#9ae7ff)}
      .red-fill{background:linear-gradient(90deg,#6e1313,#d83c3c,#ff9494)}
      .green-fill{background:linear-gradient(90deg,#1d6135,#52d280,#b7ffd0)}
      .value.alert{color:var(--red2)}
      .value.safe{color:var(--green)}
      .stage-topbar.critical-banner{
        border-color:rgba(255,123,123,.22);
        box-shadow:0 0 0 1px rgba(255,123,123,.08) inset, 0 0 18px rgba(255,0,0,.08)
      }
      .notice.epic{
        border-color:rgba(217,185,131,.32);
        box-shadow:var(--shadow), 0 0 24px rgba(217,185,131,.12)
      }
    `;
    document.head.appendChild(style);
  }

  function ensureHudEnhancements() {
    const stageTopbar = document.querySelector(".stage-topbar");
    if (stageTopbar && !stageTopbar.id) stageTopbar.id = "stageTopbar";

    const asthmaCard = document.querySelector("#asthmaText")?.closest(".mini-card");
    if (asthmaCard && !document.getElementById("asthmaFill")) {
      asthmaCard.insertAdjacentHTML("beforeend", '<div class="hud-bar"><div id="asthmaFill" class="hud-fill gold-fill"></div></div>');
    }

    const comboCard = document.querySelector("#comboText")?.closest(".mini-card");
    if (comboCard && !document.getElementById("comboFill")) {
      comboCard.insertAdjacentHTML("beforeend", '<div class="hud-bar"><div id="comboFill" class="hud-fill blue-fill"></div></div>');
    }

    const grid = document.querySelector(".mini-grid");
    if (grid && !document.getElementById("riskText")) {
      grid.insertAdjacentHTML("beforeend", `
        <div class="mini-card">
          <div class="label">Risque global</div>
          <div class="value" id="riskText">Faible</div>
          <div class="hud-bar"><div id="riskFill" class="hud-fill red-fill"></div></div>
        </div>
        <div class="mini-card">
          <div class="label">Crise en cours</div>
          <div class="value safe" id="crisisText">Non</div>
          <div class="hud-bar"><div id="crisisFill" class="hud-fill green-fill"></div></div>
        </div>
      `);
    }
  }

  function ensureRunDefaults(runState) {
    const defaults = {
      crisisMeter: 0,
      cigaretteStacks: 0,
      ventolineStacks: 0,
      majorCrisisCooldown: 0,
      smokeSurgeMult: 1,
      ventolineCrashMult: 1,
      cigaretteStackGainMult: 1,
      ventolineStackGainMult: 1,
      crisisDecayMult: 1
    };
    Object.entries(defaults).forEach(([key, value]) => {
      if (typeof runState[key] !== "number") runState[key] = value;
    });
  }

  function getCrisisCount() {
    return state.run.activeEffects.filter(effect => effect.negative).length;
  }

  function getRiskData(derived) {
    const value = Math.min(100, Math.max(0,
      state.run.asthmaIntensity * 7
      + state.run.cigaretteStacks * 12
      + state.run.ventolineStacks * 8
      + state.run.crisisMeter * 0.55
      + Math.max(0, (derived.drain - derived.passiveHp)) * 10
    ));

    let label = "Faible";
    if (value >= 75) label = "Extrême";
    else if (value >= 50) label = "Élevé";
    else if (value >= 25) label = "Moyen";

    return { value, label };
  }

  function getStageMessage({ hpPct, runState, derived, riskData, crisisCount }) {
    if (hpPct <= 20) return "Alex est à deux doigts de céder.";
    if (crisisCount >= 2) return "Les crises se superposent. Chaque seconde devient violente.";
    if (riskData.value >= 75) return "Le risque explose. Une grande crise peut tomber à tout moment.";
    if (runState.asthmaIntensity >= 5) return "L’asthme prend le dessus. Il faut casser la montée.";
    if (derived.drain > derived.passiveHp + derived.clickHp * 0.15) return "La perte dépasse ton contrôle. Achète ou clique davantage.";
    if (runState.souffle > 1000) return "Tu commences à dominer la run.";
    return "Le rythme est fragile, mais tu tiens.";
  }

  function renderAchievements() {
    els.achievementList.innerHTML = "";
    achievements.forEach(achievement => {
      const unlocked = state.unlocked.includes(achievement.id);
      const div = document.createElement("div");
      div.className = `achievement${unlocked ? "" : " locked"}`;
      div.textContent = `${unlocked ? "✓" : "✦"} ${achievement.name}`;
      els.achievementList.appendChild(div);
    });
  }

  function renderDirtySections(nowMs = performance.now()) {
    const derived = getDerived(state.run, generatorDefs);
    const maxHp = getMaxHp();
    const hpPct = Math.max(0, Math.min(100, (state.run.hp / maxHp) * 100));
    const riskData = getRiskData(derived);
    const crisisCount = getCrisisCount();

    if (dirty.hud) {
      renderHud({
        els,
        runState: state.run,
        derived,
        maxHp,
        hpPct,
        fmt,
        comboMultiplier: getComboMultiplier(state.run),
        dead: state.dead,
        getStageMessage,
        defibPrice: getDefibPrice(),
        riskData,
        crisisCount
      });
      dirty.hud = false;
    }

    if (dirty.effects) {
      renderEffects({ container: els.effectsList, activeEffects: state.run.activeEffects, nowMs });
      dirty.effects = false;
    }

    if (dirty.shop) {
      renderShop({
        container: els.shopList,
        state,
        generatorDefs,
        fmt,
        canBuyGenerator,
        onBuy: def => {
          const buy = canBuyGenerator(state, def);
          if (!buy.ok) return;
          state.run.souffle -= buy.cost;
          state.run.generators[def.id] = (state.run.generators[def.id] || 0) + 1;
          pushNotice("Achat", `${def.name} installé.`, "neutral");
          markDirty("hud", "shop", "upgrades");
        }
      });
      dirty.shop = false;
    }

    if (dirty.upgrades) {
      renderUpgrades({
        container: els.upgradeList,
        state,
        upgradeDefs,
        upgradeCategories,
        fmt,
        canBuyUpgrade,
        buyBlockReasons: BUY_BLOCK_REASONS,
        onBuy: up => {
          const buy = canBuyUpgrade(state, up);
          if (!buy.ok) return;
          state.run.souffle -= buy.cost;
          state.run.purchasedUpgrades.push(up.id);
          up.apply(state.run);
          ensureRunDefaults(state.run);
          pushNotice("Amélioration achetée", `${up.name} activée. Effet appliqué immédiatement.`, "good");
          spawnFloat(innerWidth * 0.78, innerHeight * 0.40, `✓ ${up.name}`, "good");
          maybeUnlockAchievements();
          markDirty("hud", "shop", "upgrades");
        }
      });
      dirty.upgrades = false;
    }

    if (dirty.achievements) {
      renderAchievements();
      dirty.achievements = false;
    }
  }

  function persistState() {
    saveState(state);
  }

  function restartRun() {
    state = resetRun(state, generatorDefs);
    ensureRunDefaults(state.run);
    els.deathOverlay.classList.remove("show");
    markDirty("hud", "effects", "shop", "upgrades", "achievements");
    persistState();
  }

  function clearSave() {
    state = hardReset(generatorDefs);
    ensureRunDefaults(state.run);
    markDirty("hud", "effects", "shop", "upgrades", "achievements");
    pushNotice("Sauvegarde réinitialisée", "Tout repart de zéro.", "bad");
  }

  function addSouffle(amount) {
    if (!amount) return;
    state.run.souffle += amount;
    if (amount > 0) state.run.lifetimeSouffle += amount;
  }

  function heal(amount) {
    state.run.hp = Math.min(getMaxHp(), state.run.hp + amount);
    state.run.bestHp = Math.max(state.run.bestHp, state.run.hp);
  }

  function hurt(amount) {
    state.run.hp -= amount;
    if (state.run.hp <= 0) tryDefibOrDie();
  }

  function applyEffect(effect) {
    state.run.activeEffects = computeAppliedEffect({
      activeEffects: state.run.activeEffects,
      effect,
      runState: state.run,
      nowMs: performance.now()
    });
    markDirty("effects", "hud");
  }

  function removeExpiredEffects(now) {
    const before = state.run.activeEffects.length;
    state.run.activeEffects = computeRemainingEffects(state.run.activeEffects, now);
    if (state.run.activeEffects.length !== before) markDirty("effects", "hud");
  }

  function tryDefibOrDie() {
    const resolution = resolveDefibOrDeath(state.run);
    state.run = resolution.nextRunState;
    ensureRunDefaults(state.run);

    if (resolution.outcome === "defib") {
      applyEffect(resolution.effect);
      flash("blue");
      pushNotice("Défibrillateur déclenché", "Alex revient in extremis.", "good");
      spawnFloat(innerWidth * 0.56, innerHeight * 0.58, `+${fmt(resolution.restoredHp)} PV`, "blue");
      markDirty("hud", "shop", "upgrades");
      return;
    }

    state.dead = true;
    els.deathOverlay.classList.add("show");
    flash("red");
    pushNotice("Run terminée", "Alex s’est effondré.", "bad");
    markDirty("hud", "shop", "upgrades");
  }

  function spawnFloat(x, y, text, cls = "good") {
    const el = document.createElement("div");
    el.className = `float-text ${cls}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.textContent = text;
    els.spawnLayer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  function pushNotice(title, body, tone = "neutral") {
    const el = document.createElement("div");
    el.className = `notice ${tone}`;
    el.innerHTML = `<div class="n-title">${title}</div><div class="n-body">${body}</div>`;
    els.notifications.prepend(el);
    while (els.notifications.children.length > 5) els.notifications.lastChild.remove();
    setTimeout(() => el.remove(), 4800);
  }

  function flash(color) {
    const el = color === "red" ? els.flashRed : els.flashBlue;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
  }

  function maybeUnlockAchievements() {
    let unlockedAny = false;
    for (const achievement of achievements) {
      if (!state.unlocked.includes(achievement.id) && achievement.check(state.run)) {
        state.unlocked.push(achievement.id);
        unlockedAny = true;
        pushNotice("Trophée débloqué", achievement.name, "good");
      }
    }
    if (unlockedAny) markDirty("achievements");
  }

  function clickLung() {
    if (state.dead) return;
    const derived = getDerived(state.run, generatorDefs);
    let clickHp = derived.clickHp;
    let clickSouffle = derived.clickSouffle;
    let tone = "good";

    if (Math.random() < state.run.critChance) {
      clickHp *= (1 + state.run.critMult);
      clickSouffle *= (1 + state.run.critMult * 0.55);
      tone = "gold";
      pushNotice("Clic critique", "Respiration explosive.", "good");
    }

    heal(clickHp);
    addSouffle(clickSouffle);
    state.run.totalClicks += 1;
    state.run.combo = Math.min(20, state.run.combo + 1);
    state.run.crisisMeter = Math.max(0, state.run.crisisMeter - 0.8);

    const rect = document.querySelector("#lungButton").getBoundingClientRect();
    spawnFloat(rect.left + rect.width * 0.50, rect.top + rect.height * 0.42, `+${fmt(clickHp)} PV`, tone === "gold" ? "gold" : "good");
    spawnFloat(rect.left + rect.width * 0.58, rect.top + rect.height * 0.60, `+${fmt(clickSouffle)} souffle`, tone === "gold" ? "gold" : "blue");
    document.querySelector("#lungButton").classList.add("clicked");
    setTimeout(() => document.querySelector("#lungButton").classList.remove("clicked"), 90);
    flash("blue");
    maybeUnlockAchievements();
    markDirty("hud", "shop", "upgrades");
  }

  function triggerMajorCrisis(kind = "generic") {
    if (state.dead) return false;

    if (kind === "smoke") {
      applyEffect({
        id: "major_smoke_crisis",
        name: "Crise nicotinique",
        duration: 14,
        drainAdd: 2.9 * state.run.smokePenaltyMult * state.run.smokeSurgeMult,
        clickHpMult: 0.72,
        clickSouffleMult: 0.84,
        passiveSouffleMult: 0.78,
        passiveHpMult: 0.82,
        negative: true
      });
      hurt(18 + state.run.cigaretteStacks * 2);
      state.run.crisisMeter = Math.min(100, state.run.crisisMeter + 24);
      state.run.majorCrisisCooldown = 22;
      pushNotice("Grande crise – cigarette", "Les poumons d’Alex craquent brutalement après l’enchaînement des cigarettes.", "epic");
      flash("red");
      return true;
    }

    if (kind === "ventoline") {
      applyEffect({
        id: "major_ventoline_crisis",
        name: "Rebond bronchodilatateur",
        duration: 16,
        drainAdd: 2.2 * state.run.ventolineCrashMult,
        clickHpMult: 0.78,
        passiveHpMult: 0.80,
        passiveSouffleMult: 0.82,
        negative: true
      });
      hurt(12 + state.run.ventolineStacks * 2);
      state.run.crisisMeter = Math.min(100, state.run.crisisMeter + 20);
      state.run.majorCrisisCooldown = 20;
      pushNotice("Grande crise – ventoline", "Le corps d’Alex réagit mal à l’abus de ventoline. Rebond violent.", "epic");
      flash("red");
      return true;
    }

    applyEffect({
      id: "major_breath_crisis",
      name: "Étouffement brutal",
      duration: 12,
      drainAdd: 2.5,
      clickHpMult: 0.74,
      passiveSouffleMult: 0.76,
      negative: true
    });
    hurt(14);
    state.run.crisisMeter = Math.min(100, state.run.crisisMeter + 18);
    state.run.majorCrisisCooldown = 18;
    pushNotice("Grande crise", "Alex perd le rythme respiratoire. La run devient instable.", "epic");
    flash("red");
    return true;
  }

  function maybeTriggerMajorCrisis(source) {
    if (state.run.majorCrisisCooldown > 0 || state.dead) return false;

    if (source === "smoke" && state.run.cigaretteStacks >= 3) {
      const chance = Math.min(0.85, 0.22 + state.run.cigaretteStacks * 0.14 + state.run.crisisMeter / 220);
      if (Math.random() < chance) return triggerMajorCrisis("smoke");
    }

    if (source === "ventoline" && state.run.ventolineStacks >= 3) {
      const chance = Math.min(0.70, 0.18 + state.run.ventolineStacks * 0.12 + state.run.crisisMeter / 260);
      if (Math.random() < chance) return triggerMajorCrisis("ventoline");
    }

    return false;
  }

  function useVentoline() {
    if (state.dead || state.run.ventolineCooldown > 0) return;
    const efficiency = Math.max(0.45, 1 - state.run.ventolineTolerance * 0.7);
    const healAmount = 18 * state.run.ventolinePower * efficiency;
    heal(healAmount);
    applyEffect({ id: "ventoline", name: "Ventoline", duration: 8, drainAdd: -1.3 * state.run.ventolinePower * efficiency, clickHpMult: 1.08 });
    state.run.ventolineCooldown = 16 * state.run.ventolineCooldownMult;
    state.run.ventolineTolerance = Math.min(0.6, state.run.ventolineTolerance + 0.06);
    state.run.ventolineStacks = Math.min(6, state.run.ventolineStacks + 1 * state.run.ventolineStackGainMult);
    state.run.crisisMeter = Math.min(100, state.run.crisisMeter + 6);
    pushNotice("Ventoline", "Alex reprend de l’air.", "good");
    spawnFloat(innerWidth * 0.56, innerHeight * 0.56, `+${fmt(healAmount)} PV`, "good");
    maybeTriggerMajorCrisis("ventoline");
    markDirty("hud", "shop", "upgrades");
  }

  function buyDefibCharge() {
    const price = getDefibPrice();
    if (state.dead || state.run.souffle < price) return;
    state.run.souffle -= price;
    state.run.defibCharges += 1;
    pushNotice("Défibrillateur acheté", "Charge supplémentaire prête.", "neutral");
    markDirty("hud", "shop", "upgrades");
  }

  function doWalk() {
    if (state.dead || state.run.walkCooldown > 0) return;
    const reward = 26 * state.run.walkRewardMult;
    state.run.walkCooldown = 10;
    addSouffle(reward);
    state.run.crisisMeter = Math.min(100, state.run.crisisMeter + 3);
    applyEffect({ id: "walk", name: "Marche", duration: 10, drainAdd: 0.65 * state.run.walkPenaltyMult, clickHpMult: 0.96, negative: true });
    pushNotice("Marche à pied", `+${fmt(reward)} souffle, mais Alex s’essouffle.`, "neutral");
    spawnFloat(innerWidth * 0.58, innerHeight * 0.58, `+${fmt(reward)} souffle`, "blue");
    markDirty("hud", "shop", "upgrades");
  }

  function doRun() {
    if (state.dead || state.run.runCooldown > 0) return;
    const reward = 90 * state.run.runRewardMult;
    state.run.runCooldown = 16;
    addSouffle(reward);
    state.run.crisisMeter = Math.min(100, state.run.crisisMeter + 8);
    applyEffect({ id: "run", name: "Course", duration: 8, drainAdd: 2.3 * state.run.runPenaltyMult, clickHpMult: 0.9, negative: true });
    if (Math.random() < 0.35) {
      applyEffect({ id: "panic", name: "Panique", duration: 6, drainAdd: 1.2, clickHpMult: 0.75, negative: true });
      hurt(8);
      pushNotice("Course à pied", `+${fmt(reward)} souffle, mais crise violente !`, "bad");
      flash("red");
    } else {
      pushNotice("Course à pied", `+${fmt(reward)} souffle. Alex a tenu bon.`, "neutral");
      flash("blue");
    }
    spawnFloat(innerWidth * 0.60, innerHeight * 0.58, `+${fmt(reward)} souffle`, "blue");
    markDirty("hud", "shop", "upgrades");
  }

  function doSmoke() {
    if (state.dead || state.run.smokeCooldown > 0) return;
    state.run.smokeCooldown = 14;
    addSouffle(48);
    heal(3);
    state.run.cigaretteStacks = Math.min(6, state.run.cigaretteStacks + 1 * state.run.cigaretteStackGainMult);
    state.run.crisisMeter = Math.min(100, state.run.crisisMeter + 10);
    applyEffect({ id: "smoke", name: "Cigarette", duration: 18, drainAdd: 1.0 * state.run.smokePenaltyMult, clickSouffleMult: 1.18, negative: true });
    pushNotice("Cigarette", "Petit boost immédiat. Les poumons paieront plus tard.", "bad");
    flash("red");
    maybeTriggerMajorCrisis("smoke");
    markDirty("hud", "shop", "upgrades");
  }

  function triggerRandomEvent() {
    if (state.dead) return;
    const event = pickRandomEvent(state.run);
    for (const effect of event.effects || []) applyEffect(effect);
    if (event.heal) heal(event.heal);
    if (event.hurt) {
      hurt(event.hurt);
      state.run.crisisMeter = Math.min(100, state.run.crisisMeter + Math.max(4, event.hurt * 0.3));
    }
    if (event.notice) pushNotice(event.notice.title, event.notice.body, event.notice.tone);
    if (event.flash) flash(event.flash);
    markDirty("hud", "shop", "upgrades");
  }

  document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
    btn.classList.add("active");
    document.querySelector(`#${btn.dataset.tab}`).classList.add("active");
  }));

  document.querySelector("#lungButton").addEventListener("click", clickLung);
  document.querySelector("#ventolineBtn").addEventListener("click", useVentoline);
  document.querySelector("#defibBtn").addEventListener("click", buyDefibCharge);
  document.querySelector("#walkBtn").addEventListener("click", doWalk);
  document.querySelector("#runBtn").addEventListener("click", doRun);
  document.querySelector("#smokeBtn").addEventListener("click", doSmoke);
  document.querySelector("#manualResetBtn").addEventListener("click", () => {
    restartRun();
    pushNotice("Run relancée", "Tu repars depuis le début.", "neutral");
  });
  document.querySelector("#retryBtn").addEventListener("click", restartRun);
  document.querySelector("#resetSaveBtn").addEventListener("click", clearSave);

  function tick(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;

    if (!state.dead) {
      state.run.timeAlive += dt;
      state.run.ventolineCooldown = Math.max(0, state.run.ventolineCooldown - dt);
      state.run.walkCooldown = Math.max(0, state.run.walkCooldown - dt);
      state.run.runCooldown = Math.max(0, state.run.runCooldown - dt);
      state.run.smokeCooldown = Math.max(0, state.run.smokeCooldown - dt);
      state.run.majorCrisisCooldown = Math.max(0, state.run.majorCrisisCooldown - dt);
      state.run.ventolineTolerance = Math.max(0, state.run.ventolineTolerance - dt * 0.008);
      state.run.combo = Math.max(0, state.run.combo - dt * 0.08);

      state.run.cigaretteStacks = Math.max(0, state.run.cigaretteStacks - dt * 0.07);
      state.run.ventolineStacks = Math.max(0, state.run.ventolineStacks - dt * 0.05);
      state.run.crisisMeter = Math.max(0, state.run.crisisMeter - dt * 1.8 * state.run.crisisDecayMult);

      const asthmaAcceleration = 1 + state.run.cigaretteStacks * 0.10 + state.run.ventolineStacks * 0.05 + Math.max(0, state.run.crisisMeter - 50) / 120;
      state.run.asthmaIntensity = Math.min(10, state.run.asthmaIntensity + state.run.asthmaGrowthRate * asthmaAcceleration * dt);

      removeExpiredEffects(now);

      const derived = getDerived(state.run, generatorDefs);
      if (derived.passiveSouffle > 0) addSouffle(derived.passiveSouffle * dt);
      if (derived.passiveHp > 0) heal(derived.passiveHp * dt);
      if (derived.drain > 0) hurt(derived.drain * dt);

      const riskData = getRiskData(derived);

      if (state.run.asthmaIntensity > 5 && Math.random() < dt * 0.06) {
        applyEffect({ id: "micro_crisis", name: "Pic d’asthme", duration: 5, drainAdd: 1.0, clickHpMult: 0.88, negative: true });
      }

      if (state.run.majorCrisisCooldown <= 0 && riskData.value >= 78 && Math.random() < dt * 0.07) {
        if (state.run.cigaretteStacks >= Math.max(2, state.run.ventolineStacks)) triggerMajorCrisis("smoke");
        else if (state.run.ventolineStacks >= 2) triggerMajorCrisis("ventoline");
        else triggerMajorCrisis("generic");
      }

      if (now >= nextEventAt) {
        triggerRandomEvent();
        nextEventAt = now + Math.max(5000, 15000 + Math.random() * 8000 - state.run.asthmaIntensity * 700 - riskData.value * 45);
      }

      markDirty("hud");
      if (Math.floor(now / 700) !== Math.floor((now - dt * 1000) / 700)) {
        markDirty("shop", "upgrades", "effects");
      }
    }

    renderDirtySections(now);
    requestAnimationFrame(tick);
  }

  maybeUnlockAchievements();
  renderDirtySections();
  setInterval(persistState, 3000);
  window.addEventListener("beforeunload", persistState);
  requestAnimationFrame(tick);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGame, { once: true });
} else {
  initGame();
}
