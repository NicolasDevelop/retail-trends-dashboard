import { getMeliHeaders } from "../lib/meli.js";

async function check(url) {
  try {
    const response = await fetch(url, {
      headers: await getMeliHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    return {
      ok: response.ok,
      status: response.status,
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
    },
    checks: {
      trends: await check("https://api.mercadolibre.com/trends/MLC"),
      search: await check("https://api.mercadolibre.com/sites/MLC/search?q=notebook&limit=1"),
    },
  });
}
