const REQUEST_TIMEOUT_MS = 8000;

export async function refreshMeliAccessToken() {
  if (!process.env.MELI_REFRESH_TOKEN || !process.env.MELI_CLIENT_ID || !process.env.MELI_CLIENT_SECRET) {
    return null;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.MELI_CLIENT_ID,
    client_secret: process.env.MELI_CLIENT_SECRET,
    refresh_token: process.env.MELI_REFRESH_TOKEN,
  });

  const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok) {
    const error = new Error(payload.message || `Refresh token request failed with ${tokenResponse.status}`);
    error.status = tokenResponse.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function getMeliAccessToken({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    const refreshed = await refreshMeliAccessToken();
    if (refreshed?.access_token) return refreshed.access_token;
  }

  if (process.env.MELI_ACCESS_TOKEN) {
    return process.env.MELI_ACCESS_TOKEN;
  }

  if (!process.env.MELI_CLIENT_ID || !process.env.MELI_CLIENT_SECRET) {
    return "";
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.MELI_CLIENT_ID,
    client_secret: process.env.MELI_CLIENT_SECRET,
  });

  const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok) {
    const error = new Error(payload.message || `Token request failed with ${tokenResponse.status}`);
    error.status = tokenResponse.status;
    throw error;
  }

  return payload.access_token || "";
}

export async function getMeliHeaders() {
  const accessToken = await getMeliAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function fetchMeliJson(url) {
  let response = await fetch(url, {
    headers: await getMeliHeaders(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  let refreshedToken = null;

  if ((response.status === 401 || response.status === 403) && process.env.MELI_REFRESH_TOKEN) {
    const refreshed = await refreshMeliAccessToken();
    refreshedToken = refreshed?.access_token || null;

    if (refreshedToken) {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${refreshedToken}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    }
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || `Mercado Libre responded ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    error.refreshedToken = refreshedToken;
    throw error;
  }

  return { payload, refreshedToken };
}
