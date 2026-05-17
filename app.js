let products = [];
const DATA_VERSION = "shopping-v1";

const state = {
  query: "",
  category: "Todas",
  channel: "Todos",
  minScore: 35,
  loading: true,
  error: "",
  source: "",
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
  sourceText: document.querySelector("#sourceText"),
  liveStatus: document.querySelector("#liveStatus"),
};

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, values, firstLabel, currentValue) {
  const options = [firstLabel, ...values];
  select.innerHTML = options.map((value) => `<option value="${value}">${value}</option>`).join("");
  select.value = options.includes(currentValue) ? currentValue : firstLabel;
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

function setLoading(isLoading) {
  state.loading = isLoading;
  els.refreshButton.disabled = isLoading;
  els.exportButton.disabled = isLoading || !products.length;
  els.refreshButton.textContent = isLoading ? "..." : "R";
}

function renderMetrics(items) {
  const pricedItems = items.filter((item) => item.price > 0);
  els.metricProducts.textContent = items.length;
  els.metricScore.textContent = Math.round(average(items, "score"));
  els.metricPrice.textContent = pricedItems.length ? money.format(average(pricedItems, "price")) : "Sin detalle";
  els.metricGrowth.textContent = `${Math.round(average(items, "growth"))}%`;
}

function renderRows(items) {
  if (state.loading) {
    els.count.textContent = "Cargando Mercado Libre";
    els.rows.innerHTML = `
      <tr>
        <td colspan="10"><strong>Consultando tendencias y publicaciones reales...</strong></td>
      </tr>
    `;
    return;
  }

  if (state.error) {
    els.count.textContent = "Sin datos";
    els.rows.innerHTML = `
      <tr>
        <td colspan="10"><strong>${state.error}</strong></td>
      </tr>
    `;
    return;
  }

  els.count.textContent = `${items.length} resultados`;
  if (!items.length) {
    els.rows.innerHTML = `
      <tr>
        <td colspan="10"><strong>No hay productos con esos filtros.</strong></td>
      </tr>
    `;
    return;
  }

  els.rows.innerHTML = items
    .map(
      (product) => `
        <tr>
          <td>
            <strong>${product.name}</strong>
            <a class="row-link" href="${product.url}" target="_blank" rel="noreferrer">Ver fuente</a>
          </td>
          <td>${product.category}</td>
          <td>${product.channel}</td>
          <td>${product.price > 0 ? money.format(product.price) : "Sin detalle"}</td>
          <td>
            ${product.listingCount ? product.listingCount.toLocaleString("es-CL") : "Sin detalle"}
            ${product.minPrice && product.maxPrice ? `<span class="cell-note">${money.format(product.minPrice)} - ${money.format(product.maxPrice)}</span>` : ""}
          </td>
          <td>${product.freeShippingRate ? `${product.freeShippingRate}%` : "Sin detalle"}</td>
          <td>
            ${product.topSeller || "Sin detalle"}
            <span class="cell-note">${product.sellerReputation || "Sin reputacion"}</span>
          </td>
          <td>${product.demand}/100 - indice ${product.growth}%</td>
          <td>${product.margin > 0 ? `${product.margin}% estimado` : "Sin detalle"}</td>
          <td><span class="score-pill">${product.score}</span></td>
        </tr>
      `,
    )
    .join("");
}

function renderSignals(items) {
  els.updatedAt.textContent = state.source || "";

  if (state.loading) {
    els.signals.innerHTML = `
      <article class="signal">
        <div>
          <strong>Conectando con Mercado Libre</strong>
          <span>La API esta armando el ranking con tendencias y busquedas reales.</span>
        </div>
        <span class="badge">live</span>
      </article>
    `;
    return;
  }

  if (state.error) {
    els.signals.innerHTML = `
      <article class="signal">
        <div>
          <strong>No se pudo cargar la fuente real</strong>
          <span>${state.error}</span>
        </div>
        <span class="badge">api</span>
      </article>
    `;
    return;
  }

  els.signals.innerHTML = items
    .slice(0, 5)
    .map(
      (product) => `
        <article class="signal">
          <div>
            <strong>${product.name}</strong>
            <span>${product.signal}</span>
          </div>
          <span class="badge">#${product.rank}</span>
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

  if (!items.length) {
    els.bars.innerHTML = `<p class="empty-text">Sin categorias para mostrar.</p>`;
  }
}

function renderSourceStatus() {
  if (els.sourceText) {
    els.sourceText.textContent = state.source || "Mercado Libre Chile";
  }

  if (els.liveStatus) {
    els.liveStatus.textContent = state.error ? "API no disponible" : "Mercado Libre en vivo";
  }
}

function render() {
  const items = filteredProducts();
  renderMetrics(items);
  renderRows(items);
  renderSignals(items);
  renderBars(items);
  renderSourceStatus();
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
  const headers = [
    "producto",
    "categoria",
    "canal",
    "precio",
    "precio_minimo",
    "precio_maximo",
    "precio_promedio",
    "publicaciones",
    "envio_gratis_pct",
    "seller",
    "reputacion_seller",
    "condicion",
    "demanda",
    "indice",
    "margen",
    "score",
    "url",
  ];
  const rows = filteredProducts().map((product) => [
    product.name,
    product.category,
    product.channel,
    product.price,
    product.minPrice || 0,
    product.maxPrice || 0,
    product.avgPrice || 0,
    product.listingCount || 0,
    product.freeShippingRate || 0,
    product.topSeller || "",
    product.sellerReputation || "",
    product.condition || "",
    product.demand,
    product.growth,
    product.margin,
    product.score,
    product.url,
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

function refreshFilters() {
  fillSelect(els.category, unique(products.map((product) => product.category)), "Todas", state.category);
  fillSelect(els.channel, unique(products.map((product) => product.channel)), "Todos", state.channel);
}

async function loadProducts() {
  setLoading(true);
  state.error = "";
  render();

  try {
    const response = await fetch(`/api/products?site=MLC&limit=12&v=${DATA_VERSION}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || payload.detail || `La API respondio con estado ${response.status}.`);
    }

    const payload = await response.json();
    products = Array.isArray(payload.products) ? payload.products : [];
    state.source = payload.source || "Mercado Libre Chile";
    state.category = "Todas";
    state.channel = "Todos";
    refreshFilters();

    if (!products.length) {
      state.error = "Mercado Libre no devolvio productos para rankear en este momento.";
    }
  } catch (error) {
    products = [];
    refreshFilters();
    state.error =
      "No se pudo consumir Mercado Libre. En Vercel configura MELI_ACCESS_TOKEN y vuelve a desplegar.";
    console.error(error);
  } finally {
    setLoading(false);
    render();
  }
}

function init() {
  refreshFilters();

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
  els.refreshButton.addEventListener("click", loadProducts);
  [els.salePrice, els.costPrice, els.feeRate, els.shippingCost].forEach((input) => {
    input.addEventListener("input", calculateProfit);
  });

  calculateProfit();
  loadProducts();
}

init();
