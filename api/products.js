import { getMeliHeaders } from "./lib/meli.js";

const SITE_IDS = new Set(["MLA", "MLB", "MLC", "MCO", "MLM", "MPE", "MLU"]);

const SITE_NAMES = {
  MLA: "Mercado Libre Argentina",
  MLB: "Mercado Livre Brasil",
  MLC: "Mercado Libre Chile",
  MCO: "Mercado Libre Colombia",
  MLM: "Mercado Libre Mexico",
  MPE: "Mercado Libre Peru",
  MLU: "Mercado Libre Uruguay",
};

const REQUEST_TIMEOUT_MS = 8000;
const FALLBACK_KEYWORDS = [
  "freidora de aire",
  "notebook",
  "celular",
  "smartwatch",
  "audifonos bluetooth",
  "cafetera",
  "protector solar",
  "aspiradora robot",
  "silla ergonomica",
  "creatina",
  "monitor gamer",
  "impresora",
  "zapatillas",
  "mochila",
  "tablet",
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTrendKeyword(trend) {
  if (typeof trend === "string") return trend;
  return trend.keyword || trend.name || trend.title || trend.query || "";
}

function getTrendUrl(trend, site, keyword) {
  if (trend.url || trend.permalink) return trend.url || trend.permalink;
  return `https://listado.mercadolibre.cl/${encodeURIComponent(keyword)}`;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: await getMeliHeaders(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = new Error(`Mercado Libre responded ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function fetchTrends(site, limit) {
  try {
    const trends = await fetchJson(`https://api.mercadolibre.com/trends/${site}`);
    return {
      sourceMode: "Mercado Libre Trends + Search",
      entries: (Array.isArray(trends) ? trends : [])
        .map((trend, index) => ({
          trend,
          keyword: getTrendKeyword(trend),
          rank: index + 1,
        }))
        .filter((entry) => entry.keyword)
        .slice(0, limit),
    };
  } catch (error) {
    if (error.status !== 403) {
      throw error;
    }

    return {
      sourceMode: "Mercado Libre Search",
      entries: FALLBACK_KEYWORDS.slice(0, limit).map((keyword, index) => ({
        trend: { keyword },
        keyword,
        rank: index + 1,
      })),
    };
  }
}

async function fetchCategoryNames(site, categoryIds) {
  const uniqueIds = [...new Set(categoryIds.filter(Boolean))].slice(0, 12);
  const pairs = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const category = await fetchJson(`https://api.mercadolibre.com/categories/${id}`);
        return [id, category.name || id];
      } catch {
        return [id, id];
      }
    }),
  );

  return Object.fromEntries(pairs);
}

function estimateMargin(price) {
  if (price <= 20000) return 32;
  if (price <= 80000) return 24;
  if (price <= 250000) return 18;
  return 14;
}

function buildProduct({ site, trend, item, rank, categoryName, resultCount }) {
  const keyword = getTrendKeyword(trend);
  const price = Math.round(Number(item.price || 0));
  const demand = clamp(100 - rank * 4, 48, 96);
  const supplySignal = clamp(Math.round(Math.log10(Math.max(resultCount, 1)) * 18), 8, 35);
  const growth = clamp(45 - rank * 2 + supplySignal, 12, 92);
  const margin = estimateMargin(price);
  const score = clamp(Math.round(demand * 0.45 + growth * 0.25 + margin * 0.2 + supplySignal * 0.1), 1, 99);

  return {
    name: item.title || keyword,
    category: categoryName || item.category_id || "Sin categoria",
    channel: "Mercado Libre",
    price,
    growth,
    demand,
    margin,
    score,
    rank,
    url: item.permalink || getTrendUrl(trend, site, keyword),
    signal: `Tendencia #${rank} en Mercado Libre; ${resultCount.toLocaleString("es-CL")} publicaciones relacionadas.`,
  };
}

export default async function handler(request, response) {
  const site = String(request.query.site || "MLC").toUpperCase();
  const limit = clamp(Number(request.query.limit || 12), 4, 20);

  if (!SITE_IDS.has(site)) {
    response.status(400).json({ error: "Unsupported site id" });
    return;
  }

  try {
    const trendResult = await fetchTrends(site, limit);
    const rankedTrends = trendResult.entries;

    const searches = await Promise.all(
      rankedTrends.map(async (entry) => {
        const url = `https://api.mercadolibre.com/sites/${site}/search?q=${encodeURIComponent(entry.keyword)}&limit=5`;
        const data = await fetchJson(url);
        const item = Array.isArray(data.results) ? data.results[0] : null;
        return {
          ...entry,
          item,
          resultCount: data.paging?.total || data.results?.length || 0,
        };
      }),
    );

    const validSearches = searches.filter((entry) => entry.item);
    const categoryNames = await fetchCategoryNames(
      site,
      validSearches.map((entry) => entry.item.category_id),
    );

    const products = validSearches.map((entry) =>
      buildProduct({
        trend: entry.trend,
        site,
        item: entry.item,
        rank: entry.rank,
        resultCount: entry.resultCount,
        categoryName: categoryNames[entry.item.category_id],
      }),
    );

    response.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    response.status(200).json({
      site,
      source: `${SITE_NAMES[site] || site} - ${trendResult.sourceMode}`,
      generatedAt: new Date().toISOString(),
      products,
    });
  } catch (error) {
    response.status(error.status || 502).json({
      error: "Could not build real product ranking from Mercado Libre",
      detail: error.message,
      message:
        error.status === 403
          ? "Mercado Libre rechazo la consulta. Revisa MELI_CLIENT_ID, MELI_CLIENT_SECRET o MELI_ACCESS_TOKEN en Vercel."
          : "No se pudo consultar Mercado Libre en este momento.",
    });
  }
}
