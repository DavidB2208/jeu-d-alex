export function renderEffects({ container, activeEffects, nowMs }) {
  container.innerHTML = "";

  if (activeEffects.length === 0) {
    const pill = document.createElement("div");
    pill.className = "effect-pill neutral";
    pill.textContent = "Aucun effet actif";
    container.appendChild(pill);
    return;
  }

  activeEffects
    .slice()
    .sort((a, b) => a.endsAt - b.endsAt)
    .forEach(effect => {
      const pill = document.createElement("div");
      const bad = effect.negative || (effect.drainAdd || 0) > 0 || (effect.clickHpMult || 1) < 1;
      const good = !bad && (((effect.drainAdd || 0) < 0)
        || (effect.clickHpMult || 1) > 1
        || (effect.passiveSouffleMult || 1) > 1
        || (effect.passiveHpMult || 1) > 1);

      pill.className = `effect-pill ${good ? "good" : bad ? "bad" : "neutral"}`;
      pill.textContent = `${effect.name} · ${Math.max(0, Math.ceil((effect.endsAt - nowMs) / 1000))}s`;
      container.appendChild(pill);
    });
}
