export function renderShop({ container, state, generatorDefs, fmt, canBuyGenerator, onBuy }) {
  container.innerHTML = "";

  generatorDefs.forEach(def => {
    const buy = canBuyGenerator(state, def);
    const cost = buy.cost;
    const owned = state.run.generators[def.id] || 0;

    const item = document.createElement("div");
    item.className = "shop-item";
    item.innerHTML = `
      <div class="shop-top">
        <div>
          <div class="shop-name">${def.name}</div>
          <div class="shop-desc">${def.desc}</div>
          <div class="shop-meta">+${fmt(def.souffle)} souffle/s · +${fmt(def.hp)} PV/s</div>
          <div class="shop-owned">Possédé : ${owned}</div>
        </div>
        <button class="buy-btn"${buy.ok ? "" : " disabled"}>${fmt(cost)} souffle</button>
      </div>
    `;

    item.querySelector("button").addEventListener("click", () => onBuy(def));
    container.appendChild(item);
  });
}
