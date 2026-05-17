import { fetchMeliJson } from "./lib/meli.js";

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
const SEARCH_LIMIT = 5;
const SHOPPING_ENRICH_LIMIT = 6;
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
  const { payload } = await fetchMeliJson(url);
  return payload;
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
  if (!price) return 0;
  if (price <= 20000) return 32;
  if (price <= 80000) return 24;
  if (price <= 250000) return 18;
  return 14;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getSellerReputation(seller) {
  const level = seller?.seller_reputation?.level_id || "";
  const powerSeller = seller?.seller_reputation?.power_seller_status || "";
  return powerSeller || level || "Sin detalle";
}

function getShippingStats(items) {
  const freeShipping = items.filter((item) => item.shipping?.free_shipping).length;
  return {
    freeShipping,
    freeShippingRate: items.length ? Math.round((freeShipping / items.length) * 100) : 0,
  };
}

async function safeFetchJson(url) {
  try {
    return await fetchJson(url);
  } catch {
    return null;
  }
}

async function fetchSerpApiShopping(keyword) {
  if (!process.env.SERPAPI_API_KEY) return null;

  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", keyword);
  url.searchParams.set("gl", "cl");
  url.searchParams.set("hl", "es");
  url.searchParams.set("google_domain", "google.cl");
  url.searchParams.set("api_key", process.env.SERPAPI_API_KEY);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.error) {
    return null;
  }

  return Array.isArray(payload.shopping_results) ? payload.shopping_results.slice(0, SEARCH_LIMIT) : [];
}

async function enrichSearchEntry(site, entry, data) {
  const results = Array.isArray(data.results) ? data.results.slice(0, SEARCH_LIMIT) : [];
  const item = results[0] || null;

  if (!item) {
    return {
      ...entry,
      item: null,
      items: [],
      resultCount: data.paging?.total || 0,
      seller: null,
      searchStatus: "empty",
    };
  }

  const itemIds = results.map((result) => result.id).filter(Boolean);
  const detailedItems = await Promise.all(
    itemIds.map((id) => safeFetchJson(`https://api.mercadolibre.com/items/${id}`)),
  );
  const usableDetails = detailedItems.filter(Boolean);
  const seller = item.seller?.id ? await safeFetchJson(`https://api.mercadolibre.com/users/${item.seller.id}`) : null;

  return {
    ...entry,
    item: usableDetails[0] || item,
    items: usableDetails.length ? usableDetails : results,
    seller,
    resultCount: data.paging?.total || data.results?.length || 0,
    searchStatus: "ok",
  };
}

function buildTrendOnlyProduct({ site, trend, keyword, rank }) {
  const demand = clamp(100 - rank * 4, 48, 96);
  const growth = clamp(60 - rank * 2, 12, 92);
  const score = clamp(Math.round(demand * 0.7 + growth * 0.3), 1, 99);

  return {
    name: keyword,
    category: "Tendencia",
    channel: "Mercado Libre Trends",
    price: 0,
    growth,
    demand,
    margin: 0,
    score,
    rank,
    listingCount: 0,
    minPrice: 0,
    maxPrice: 0,
    avgPrice: 0,
    freeShippingRate: 0,
    topSeller: "Sin detalle",
    sellerReputation: "Sin detalle",
    condition: "Sin detalle",
    itemIds: [],
    url: getTrendUrl(trend, site, keyword),
    signal: `Tendencia #${rank} detectada por Mercado Libre. Search no entrego detalle de publicaciones.`,
  };
}

function buildShoppingProduct({ site, trend, keyword, rank, shoppingResults }) {
  const prices = shoppingResults
    .map((item) => Number(item.extracted_price || item.price || 0))
    .filter((price) => price > 0);
  const avgPrice = Math.round(average(prices));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const first = shoppingResults[0] || {};
  const freeShipping = shoppingResults.filter((item) =>
    String(item.delivery || item.shipping || "").toLowerCase().includes("gratis"),
  ).length;
  const freeShippingRate = shoppingResults.length ? Math.round((freeShipping / shoppingResults.length) * 100) : 0;
  const demand = clamp(100 - rank * 4, 48, 96);
  const growth = clamp(60 - rank * 2, 12, 92);
  const margin = estimateMargin(avgPrice);
  const score = clamp(Math.round(demand * 0.42 + growth * 0.22 + margin * 0.16 + shoppingResults.length * 3), 1, 99);

  return {
    name: first.title || keyword,
    category: "Google Shopping",
    channel: "Google Shopping",
    price: avgPrice,
    growth,
    demand,
    margin,
    score,
    rank,
    listingCount: shoppingResults.length,
    minPrice,
    maxPrice,
    avgPrice,
    freeShippingRate,
    topSeller: first.source || "Google Shopping",
    sellerReputation:
      first.rating || first.reviews ? `${first.rating || "s/r"} rating - ${first.reviews || 0} reviews` : "Sin detalle",
    condition: first.second_hand_condition || "Sin detalle",
    itemIds: shoppingResults.map((item) => item.product_id).filter(Boolean),
    url: first.product_link || first.link || getTrendUrl(trend, site, keyword),
    signal: `Tendencia #${rank} de Mercado Libre enriquecida con ${shoppingResults.length} resultados de Google Shopping.`,
  };
}

function buildProduct({ site, trend, item, items, seller, rank, categoryName, resultCount }) {
  const keyword = getTrendKeyword(trend);
  const prices = items.map((entry) => Number(entry.price || 0)).filter((price) => price > 0);
  const avgPrice = Math.round(average(prices));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const price = Math.round(Number(item.price || avgPrice || 0));
  const shipping = getShippingStats(items);
  const demand = clamp(100 - rank * 4, 48, 96);
  const supplySignal = clamp(Math.round(Math.log10(Math.max(resultCount, 1)) * 18), 8, 35);
  const growth = clamp(45 - rank * 2 + supplySignal, 12, 92);
  const margin = estimateMargin(price);
  const shippingScore = shipping.freeShippingRate / 2;
  const score = clamp(
    Math.round(demand * 0.38 + growth * 0.22 + margin * 0.15 + supplySignal * 0.15 + shippingScore * 0.1),
    1,
    99,
  );

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
    listingCount: resultCount,
    minPrice,
    maxPrice,
    avgPrice,
    freeShippingRate: shipping.freeShippingRate,
    topSeller: seller?.nickname || "Sin detalle",
    sellerReputation: getSellerReputation(seller),
    condition: item.condition || "Sin detalle",
    itemIds: items.map((entry) => entry.id).filter(Boolean),
    url: item.permalink || getTrendUrl(trend, site, keyword),
    signal: `Tendencia #${rank}; ${resultCount.toLocaleString("es-CL")} publicaciones, precio promedio ${avgPrice ? avgPrice.toLocaleString("es-CL") : "sin detalle"} CLP.`,
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
        try {
          const url = `https://api.mercadolibre.com/sites/${site}/search?q=${encodeURIComponent(entry.keyword)}&limit=${SEARCH_LIMIT}`;
          const data = await fetchJson(url);
          return enrichSearchEntry(site, entry, data);
        } catch (error) {
          return {
            ...entry,
            item: null,
            items: [],
            seller: null,
            resultCount: 0,
            searchStatus: `blocked:${error.status || 0}`,
          };
        }
      }),
    );

    const validSearches = searches.filter((entry) => entry.item);
    const categoryNames = await fetchCategoryNames(
      site,
      validSearches.map((entry) => entry.item.category_id),
    );

    const enrichedProducts = validSearches.map((entry) =>
      buildProduct({
        trend: entry.trend,
        site,
        item: entry.item,
        items: entry.items,
        seller: entry.seller,
        rank: entry.rank,
        resultCount: entry.resultCount,
        categoryName: categoryNames[entry.item.category_id],
      }),
    );

    const missingEntries = searches.filter((entry) => !entry.item);
    const shoppingCandidates = missingEntries.slice(0, SHOPPING_ENRICH_LIMIT);
    const shoppingLookups = await Promise.all(
      shoppingCandidates.map(async (entry) => ({
        entry,
        shoppingResults: await fetchSerpApiShopping(entry.keyword),
      })),
    );
    const shoppingByKeyword = new Map(
      shoppingLookups
        .filter((lookup) => Array.isArray(lookup.shoppingResults) && lookup.shoppingResults.length)
        .map((lookup) => [lookup.entry.keyword, lookup.shoppingResults]),
    );

    const shoppingProducts = shoppingLookups
      .filter((lookup) => Array.isArray(lookup.shoppingResults) && lookup.shoppingResults.length)
      .map((lookup) =>
        buildShoppingProduct({
          site,
          trend: lookup.entry.trend,
          keyword: lookup.entry.keyword,
          rank: lookup.entry.rank,
          shoppingResults: lookup.shoppingResults,
        }),
      );

    const trendOnlyProducts = missingEntries
      .filter((entry) => !shoppingByKeyword.has(entry.keyword))
      .map((entry) =>
        buildTrendOnlyProduct({
          site,
          trend: entry.trend,
          keyword: entry.keyword,
          rank: entry.rank,
        }),
      );

    const products = [...enrichedProducts, ...shoppingProducts, ...trendOnlyProducts].sort((a, b) => a.rank - b.rank);

    response.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    response.status(200).json({
      site,
      source: `${SITE_NAMES[site] || site} - ${trendResult.sourceMode}`,
      generatedAt: new Date().toISOString(),
      diagnostics: {
        trends: rankedTrends.length,
        enriched: enrichedProducts.length,
        googleShopping: shoppingProducts.length,
        trendOnly: trendOnlyProducts.length,
        searchLimit: SEARCH_LIMIT,
        shoppingEnrichLimit: SHOPPING_ENRICH_LIMIT,
        hasSerpApiKey: Boolean(process.env.SERPAPI_API_KEY),
      },
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
