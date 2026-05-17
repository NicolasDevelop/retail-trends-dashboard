const DEFAULT_REDIRECT_URI = "https://retail-trends-dashboard.vercel.app/api/auth/callback";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTokenPage(payload, redirectUri) {
  const accessToken = escapeHtml(payload.access_token || "");
  const refreshToken = escapeHtml(payload.refresh_token || "");
  const expiresIn = escapeHtml(payload.expires_in || "");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Mercado Libre conectado</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f6f7f4; color: #18211f; }
      main { max-width: 900px; margin: 40px auto; padding: 24px; background: #fff; border: 1px solid #dfe4df; border-radius: 8px; }
      h1 { margin-top: 0; }
      p { line-height: 1.5; }
      pre { overflow-x: auto; padding: 16px; background: #101817; color: #e7fff8; border-radius: 8px; }
      code { font-family: Consolas, monospace; }
      .warn { padding: 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Mercado Libre conectado</h1>
      <p class="warn">Copia estos valores a Vercel como variables de entorno. No los publiques ni los subas a GitHub.</p>
      <pre><code>MELI_ACCESS_TOKEN=${accessToken}
MELI_REFRESH_TOKEN=${refreshToken}
MELI_REDIRECT_URI=${escapeHtml(redirectUri)}</code></pre>
      <p>Expira en segundos: <strong>${expiresIn}</strong>. Despues de guardar las variables en Vercel, haz redeploy del proyecto.</p>
    </main>
  </body>
</html>`;
}

export default async function handler(request, response) {
  const code = request.query.code;
  const clientId = process.env.MELI_CLIENT_ID;
  const clientSecret = process.env.MELI_CLIENT_SECRET;
  const redirectUri = process.env.MELI_REDIRECT_URI || DEFAULT_REDIRECT_URI;

  if (!code) {
    response.status(400).send("Missing OAuth code from Mercado Libre.");
    return;
  }

  if (!clientId || !clientSecret) {
    response.status(500).send("Missing MELI_CLIENT_ID or MELI_CLIENT_SECRET environment variables in Vercel.");
    return;
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const payload = await tokenResponse.json();

  if (!tokenResponse.ok) {
    response.status(tokenResponse.status).json(payload);
    return;
  }

  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.status(200).send(renderTokenPage(payload, redirectUri));
}
