import { refreshMeliAccessToken } from "../lib/meli.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRefreshPage(payload) {
  const accessToken = escapeHtml(payload.access_token || "");
  const refreshToken = escapeHtml(payload.refresh_token || process.env.MELI_REFRESH_TOKEN || "");
  const expiresAt = escapeHtml(new Date(Date.now() + Number(payload.expires_in || 0) * 1000).toISOString());

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Token Mercado Libre renovado</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f6f7f4; color: #18211f; }
      main { max-width: 900px; margin: 40px auto; padding: 24px; background: #fff; border: 1px solid #dfe4df; border-radius: 8px; }
      pre { overflow-x: auto; padding: 16px; background: #101817; color: #e7fff8; border-radius: 8px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Token renovado</h1>
      <p>Copia estos valores a Vercel y haz redeploy.</p>
      <pre><code>MELI_ACCESS_TOKEN=${accessToken}
MELI_REFRESH_TOKEN=${refreshToken}
MELI_TOKEN_EXPIRES_AT=${expiresAt}</code></pre>
    </main>
  </body>
</html>`;
}

export default async function handler(request, response) {
  try {
    const payload = await refreshMeliAccessToken();
    if (!payload?.access_token) {
      response.status(400).send("No refresh token available. Use /api/auth/start first.");
      return;
    }

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.status(200).send(renderRefreshPage(payload));
  } catch (error) {
    response.status(error.status || 500).json({
      error: "Could not refresh Mercado Libre token",
      detail: error.message,
    });
  }
}
