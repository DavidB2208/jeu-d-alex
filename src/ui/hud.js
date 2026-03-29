export function renderHud({
  els,
  runState,
  derived,
  maxHp,
  hpPct,
  fmt,
  comboMultiplier,
  dead,
  getStageMessage,
  defibPrice,
  riskData,
  crisisCount
}) {
  els.hpText.textContent = `${fmt(runState.hp)} PV`;
  els.maxHpText.textContent = fmt(maxHp);
  els.hpFill.style.width = `${hpPct}%`;
  els.drainText.textContent = `perte / sec : -${fmt(derived.drain)} · regen / sec : +${fmt(derived.passiveHp)}`;
  els.souffleText.textContent = fmt(runState.souffle);
  els.clickGainText.textContent = `+${fmt(derived.clickHp)} PV / +${fmt(derived.clickSouffle)} souffle`;
  els.passiveText.textContent = `${fmt(derived.passiveSouffle)} souffle/s · ${fmt(derived.passiveHp)} PV/s`;
  els.stateText.textContent = hpPct <= 20 ? "Critique" : (derived.drain > derived.passiveHp ? "Fragile" : "Stable");
  els.asthmaText.textContent = fmt(runState.asthmaIntensity);
  els.comboText.textContent = `x${comboMultiplier.toFixed(2)}`;
  els.ventolineInfo.textContent = runState.ventolineCooldown > 0
    ? `recharge : ${fmt(runState.ventolineCooldown)}s`
    : `tolérance : ${Math.round(runState.ventolineTolerance * 100)}% · stacks ${fmt(runState.ventolineStacks)}`;
  els.defibInfo.textContent = `charges : ${runState.defibCharges} · achat : ${fmt(defibPrice)} souffle`;

  if (els.asthmaFill) els.asthmaFill.style.width = `${Math.min(100, runState.asthmaIntensity * 10)}%`;
  if (els.comboFill) els.comboFill.style.width = `${Math.min(100, (comboMultiplier - 1) / 0.8 * 100)}%`;
  if (els.riskFill) els.riskFill.style.width = `${riskData.value}%`;
  if (els.crisisFill) els.crisisFill.style.width = `${Math.min(100, crisisCount * 25)}%`;

  if (els.riskText) {
    els.riskText.textContent = `${riskData.label} · ${fmt(riskData.value)}%`;
    els.riskText.classList.toggle("alert", riskData.value >= 60);
    els.riskText.classList.toggle("safe", riskData.value < 25);
  }

  if (els.crisisText) {
    const crisisText = crisisCount > 0 ? `Oui x${crisisCount}` : "Non";
    els.crisisText.textContent = crisisText;
    els.crisisText.classList.toggle("alert", crisisCount > 0);
    els.crisisText.classList.toggle("safe", crisisCount === 0);
  }

  if (hpPct <= 20) {
    els.hpPanel.classList.add("critical");
  } else {
    els.hpPanel.classList.remove("critical");
  }

  if (els.stageTopbar) {
    els.stageTopbar.classList.toggle("critical-banner", hpPct <= 20 || riskData.value >= 75 || crisisCount > 0);
  }

  els.stageMessage.textContent = getStageMessage({ hpPct, runState, derived, riskData, crisisCount });

  els.ventolineBtn.disabled = dead || runState.ventolineCooldown > 0;
  els.walkBtn.disabled = dead || runState.walkCooldown > 0;
  els.runBtn.disabled = dead || runState.runCooldown > 0;
  els.smokeBtn.disabled = dead || runState.smokeCooldown > 0;
  els.defibBtn.disabled = dead || runState.souffle < defibPrice;
}
