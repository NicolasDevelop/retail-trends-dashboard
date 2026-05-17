import { getMeliHeaders } from "../lib/meli.js";

async function check(url) {
  try {
    const response = await fetch(url, {
      headers: await getMeliHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      message: payload.message || payload.error || null,
      sampleKeys: payload && typeof payload === "object" ? Object.keys(payload).slice(0, 8) : [],
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
    };
  }
}

export default async function handler(request, response) {
  response.status(200).json({
    env: {
      hasClientId: Boolean(process.env.MELI_CLIENT_ID),
      hasClientSecret: Boolean(process.env.MELI_CLIENT_SECRET),
      hasAccessToken: Boolean(process.env.MELI_ACCESS_TOKEN),
      hasRefreshToken: Boolean(process.env.MELI_REFRESH_TOKEN),
      hasRedirectUri: Boolean(process.env.MELI_REDIRECT_URI),
      hasSerpApiKey: Boolean(process.env.SERPAPI_API_KEY),
    },
    checks: {
      user: await check("https://api.mercadolibre.com/users/me"),
      trends: await check("https://api.mercadolibre.com/trends/MLC"),
      search: await check("https://api.mercadolibre.com/sites/MLC/search?q=notebook&limit=1"),
      category: await check("https://api.mercadolibre.com/categories/MLC1648"),
    },
  });
}
