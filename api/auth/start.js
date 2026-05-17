const DEFAULT_REDIRECT_URI = "https://retail-trends-dashboard.vercel.app/api/auth/callback";

export default function handler(request, response) {
  const clientId = process.env.MELI_CLIENT_ID;
  const redirectUri = process.env.MELI_REDIRECT_URI || DEFAULT_REDIRECT_URI;

  if (!clientId) {
    response.status(500).send("Missing MELI_CLIENT_ID environment variable in Vercel.");
    return;
  }

  const url = new URL("https://auth.mercadolibre.com/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);

  response.redirect(url.toString());
}
