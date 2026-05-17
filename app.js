const products = [
  {
    name: "Notebook gamer RTX 4060 16GB",
    category: "Tecnologia",
    channel: "Mercado Libre",
    price: 899990,
    growth: 42,
    demand: 91,
    margin: 18,
    score: 94,
    signal: "Alta busqueda semanal y ticket alto",
  },
  {
    name: "Freidora de aire 6 litros",
    category: "Hogar",
    channel: "Mercado Libre",
    price: 74990,
    growth: 28,
    demand: 84,
    margin: 24,
    score: 88,
    signal: "Demanda recurrente con baja barrera de compra",
  },
  {
    name: "Protector solar facial SPF 50",
    category: "Belleza",
    channel: "Google Shopping",
    price: 12990,
    growth: 34,
    demand: 78,
    margin: 36,
    score: 86,
    signal: "Temporalidad fuerte y margen saludable",
  },
  {
    name: "Cafetera espresso automatica",
    category: "Hogar",
    channel: "Google Shopping",
    price: 219990,
    growth: 22,
    demand: 72,
    margin: 21,
    score: 79,
    signal: "Buen cruce entre ticket y busqueda",
  },
  {
    name: "Smartwatch AMOLED GPS",
    category: "Tecnologia",
    channel: "Mercado Libre",
    price: 59990,
    growth: 19,
    demand: 75,
    margin: 17,
    score: 76,
    signal: "Competencia alta, rotacion estable",
  },
  {
    name: "Set organizadores cocina",
    category: "Hogar",
    channel: "TikTok Shop",
    price: 15990,
    growth: 51,
    demand: 68,
    margin: 41,
    score: 83,
    signal: "Impulso social y compra visual",
  },
  {
    name: "Creatina monohidratada 300g",
    category: "Salud",
    channel: "Mercado Libre",
    price: 18990,
    growth: 31,
    demand: 81,
    margin: 27,
    score: 85,
    signal: "Alta recurrencia y comparacion por precio",
  },
  {
    name: "Silla ergonomica home office",
    category: "Oficina",
    channel: "Google Shopping",
    price: 129990,
    growth: 16,
    demand: 66,
    margin: 20,
    score: 68,
    signal: "Demanda estable, sensibilidad a envio",
  },
  {
    name: "Aspiradora robot mopa",
    category: "Hogar",
    channel: "Mercado Libre",
    price: 189990,
    growth: 25,
    demand: 73,
    margin: 16,
    score: 74,
    signal: "Interes sostenido por automatizacion",
  },
  {
    name: "Audifonos bluetooth cancelacion ruido",
    category: "Tecnologia",
    channel: "Google Shopping",
    price: 45990,
    growth: 21,
    demand: 70,
    margin: 23,
    score: 72,
    signal: "Oferta amplia, oportunidad en nichos",
  },
  {
    name: "Mochila antirrobo USB",
    category: "Accesorios",
    channel: "Mercado Libre",
    price: 24990,
    growth: 13,
    demand: 58,
    margin: 32,
    score: 61,
    signal: "Utilidad clara, crecimiento moderado",
  },
  {
    name: "Kit luces LED escritorio",
    category: "Oficina",
    channel: "TikTok Shop",
    price: 11990,
    growth: 47,
    demand: 63,
    margin: 39,
    score: 77,
    signal: "Buen producto gancho para bundles",
  },
];

const state = {
  query: "",
  category: "Todas",
  channel: "Todos",
  minScore: 35,
};

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const els = {
  search: document.querySelector("#searchInput"),
  category: document.querySelector("#categoryFilter"),
  channel: document.querySelector("#channelFilter"),
  score: document.querySelector("#scoreFilter"),
  scoreValue: document.querySelector("#scoreValue"),
  rows: document.querySelector("#productRows"),
  signals: document.querySelector("#signalList"),
  bars: document.querySelector("#categoryBars"),
  count: document.querySelector("#resultCount"),
  updatedAt: document.querySelector("#updatedAt"),
  metricProducts: document.querySelector("#metricProducts"),
  metricScore: document.querySelector("#metricScore"),
  metricPrice: document.querySelector("#metricPrice"),
  metricGrowth: document.querySelector("#metricGrowth"),
  exportButton: document.querySelector("#exportButton"),
  refreshButton: document.querySelector("#refreshButton"),
  salePrice: document.querySelector("#salePrice"),
  costPrice: document.querySelector("#costPrice"),
  feeRate: document.querySelector("#feeRate"),
  shippingCost: document.querySelector("#shippingCost"),
  profitOutput: document.querySelector("#profitOutput"),
};

function unique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, values, firstLabel) {
  select.innerHTML = [firstLabel, ...values]
    .map((value) => `<option value="${value}">${value}</option>`)
    .join("");
}

function filteredProducts() {
  const text = state.query.trim().toLowerCase();
  return products
    .filter((product) => {
      const matchesText =
        !text ||
        product.name.toLowerCase().includes(text) ||
        product.category.toLowerCase().includes(text) ||
        product.signal.toLowerCase().includes(text);
      const matchesCategory = state.category === "Todas" || product.category === state.category;
      const matchesChannel = state.channel === "Todos" || product.channel === state.channel;
      return matchesText && matchesCategory && matchesChannel && product.score >= state.minScore;
    })
    .sort((a, b) => b.score - a.score);
}

function average(items, key) {
  if (!items.length) return 0;
  return items.reduce((total, item) => total + item[key], 0) / items.length;
}

function renderMetrics(items) {
  els.metricProducts.textContent = items.length;
  els.metricScore.textContent = Math.round(average(items, "score"));
  els.metricPrice.textContent = money.format(average(items, "price"));
  els.metricGrowth.textContent = `${Math.round(average(items, "growth"))}%`;
}

function renderRows(items) {
  els.count.textContent = `${items.length} resultados`;
  if (!items.length) {
    els.rows.innerHTML = `
      <tr>
        <td colspan="7"><strong>No hay productos con esos filtros.</strong></td>
      </tr>
    `;
    return;
  }

  els.rows.innerHTML = items
    .map(
      (product) => `
        <tr>
          <td><strong>${product.name}</strong></td>
          <td>${product.category}</td>
          <td>${product.channel}</td>
          <td>${money.format(product.price)}</td>
          <td>${product.demand}/100 - +${product.growth}%</td>
          <td>${product.margin}%</td>
          <td><span class="score-pill">${product.score}</span></td>
        </tr>
      `,
    )
    .join("");
}

function renderSignals(items) {
  els.updatedAt.textContent = new Date().toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  els.signals.innerHTML = items
    .slice(0, 5)
    .map(
      (product) => `
        <article class="signal">
          <div>
            <strong>${product.name}</strong>
            <span>${product.signal}</span>
          </div>
          <span class="badge">+${product.growth}%</span>
        </article>
      `,
    )
    .join("");
}

function renderBars(items) {
  const totals = items.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + product.score;
    return acc;
  }, {});
  const max = Math.max(...Object.values(totals), 1);

  els.bars.innerHTML = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => {
      const percent = Math.round((total / max) * 100);
      return `
        <div class="bar-row">
          <div class="bar-label">
            <span>${category}</span>
            <strong>${Math.round(total)}</strong>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${percent}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function render() {
  const items = filteredProducts();
  renderMetrics(items);
  renderRows(items);
  renderSignals(items);
  renderBars(items);
}

function calculateProfit() {
  const salePrice = Number(els.salePrice.value) || 0;
  const cost = Number(els.costPrice.value) || 0;
  const feeRate = Number(els.feeRate.value) || 0;
  const shipping = Number(els.shippingCost.value) || 0;
  const fee = salePrice * (feeRate / 100);
  const profit = salePrice - cost - fee - shipping;
  const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
  els.profitOutput.textContent = `Utilidad: ${money.format(profit)} - Margen: ${margin.toFixed(1)}%`;
}

function exportCsv() {
  const headers = ["producto", "categoria", "canal", "precio", "demanda", "crecimiento", "margen", "score"];
  const rows = filteredProducts().map((product) => [
    product.name,
    product.category,
    product.channel,
    product.price,
    product.demand,
    product.growth,
    product.margin,
    product.score,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "retail-trends.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function init() {
  fillSelect(els.category, unique(products.map((product) => product.category)), "Todas");
  fillSelect(els.channel, unique(products.map((product) => product.channel)), "Todos");

  els.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });
  els.category.addEventListener("change", (event) => {
    state.category = event.target.value;
    render();
  });
  els.channel.addEventListener("change", (event) => {
    state.channel = event.target.value;
    render();
  });
  els.score.addEventListener("input", (event) => {
    state.minScore = Number(event.target.value);
    els.scoreValue.textContent = state.minScore;
    render();
  });
  els.exportButton.addEventListener("click", exportCsv);
  els.refreshButton.addEventListener("click", render);
  [els.salePrice, els.costPrice, els.feeRate, els.shippingCost].forEach((input) => {
    input.addEventListener("input", calculateProfit);
  });

  render();
  calculateProfit();
}

init();
