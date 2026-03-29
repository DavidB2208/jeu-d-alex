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
  defibPrice
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
    : `tolérance : ${Math.round(runState.ventolineTolerance * 100)}%`;
  els.defibInfo.textContent = `charges : ${runState.defibCharges} · achat : ${fmt(defibPrice)} souffle`;

  if (hpPct <= 20) {
    els.hpPanel.classList.add("critical");
  } else {
    els.hpPanel.classList.remove("critical");
  }
  els.stageMessage.textContent = getStageMessage({ hpPct, runState, derived });

  els.ventolineBtn.disabled = dead || runState.ventolineCooldown > 0;
  els.walkBtn.disabled = dead || runState.walkCooldown > 0;
  els.runBtn.disabled = dead || runState.runCooldown > 0;
  els.smokeBtn.disabled = dead || runState.smokeCooldown > 0;
  els.defibBtn.disabled = dead || runState.souffle < defibPrice;
}
