const REQUEST_TIMEOUT_MS = 8000;

export async function getMeliAccessToken() {
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
