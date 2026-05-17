const SITE_IDS = new Set(["MLA", "MLB", "MLC", "MCO", "MLM", "MPE", "MLU"]);

export default async function handler(request, response) {
  const site = String(request.query.site || "MLC").toUpperCase();

  if (!SITE_IDS.has(site)) {
    response.status(400).json({ error: "Unsupported site id" });
    return;
  }

  const headers = {};
  if (process.env.MELI_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.MELI_ACCESS_TOKEN}`;
  }

  const upstream = await fetch(`https://api.mercadolibre.com/trends/${site}`, { headers });

  if (!upstream.ok) {
    response.status(upstream.status).json({
      error: "Mercado Libre request failed",
      status: upstream.status,
      message:
        upstream.status === 403
          ? "Mercado Libre rechazo la consulta. Configura MELI_ACCESS_TOKEN en Vercel."
          : "No se pudo consultar Mercado Libre en este momento.",
    });
    return;
  }

  const trends = await upstream.json();
  response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  response.status(200).json({ site, trends });
}
