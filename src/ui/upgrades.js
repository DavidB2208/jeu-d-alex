const BLOCK_MESSAGES = {
  dead: "Run terminée",
  insufficient: "Souffle insuffisant",
  already_bought: "Déjà achetée"
};

export function renderUpgrades({
  container,
  state,
  upgradeDefs,
  upgradeCategories,
  fmt,
  canBuyUpgrade,
  buyBlockReasons,
  onBuy
}) {
  container.innerHTML = "";

  upgradeCategories.forEach(cat => {
    const block = document.createElement("div");
    block.className = "category-block";
    block.innerHTML = `<div class="category-head">${cat.name}</div><div class="category-items"></div>`;
    const categoryContainer = block.querySelector(".category-items");

    upgradeDefs.filter(up => up.category === cat.id).forEach(up => {
      const buy = canBuyUpgrade(state, up);
      const bought = buy.reason === buyBlockReasons.ALREADY_BOUGHT;
      const reasonLabel = buy.reason ? BLOCK_MESSAGES[buy.reason] : "";

      const item = document.createElement("div");
      item.className = `shop-item${bought ? " bought" : ""}`;
      item.innerHTML = `
        <div class="shop-top">
          <div>
            <div class="shop-name">${up.name}</div>
            <div class="shop-desc">${up.desc}</div>
            <div class="shop-meta">${bought ? "Amélioration achetée ✓" : `${fmt(buy.cost)} souffle`}</div>
            <div class="shop-owned">${bought ? "Cette amélioration a déjà été achetée." : reasonLabel}</div>
          </div>
          <button class="buy-btn"${buy.ok ? "" : " disabled"}>${bought ? "ACHETÉE" : "Acheter"}</button>
        </div>
      `;

      item.querySelector("button").addEventListener("click", () => onBuy(up));
      categoryContainer.appendChild(item);
    });

    container.appendChild(block);
  });
}
