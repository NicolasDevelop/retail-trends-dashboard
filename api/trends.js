import { fetchMeliJson } from "./lib/meli.js";

const SITE_IDS = new Set(["MLA", "MLB", "MLC", "MCO", "MLM", "MPE", "MLU"]);

export default async function handler(request, response) {
  const site = String(request.query.site || "MLC").toUpperCase();

  if (!SITE_IDS.has(site)) {
    response.status(400).json({ error: "Unsupported site id" });
    return;
  }

  try {
    const { payload: trends, refreshedToken } = await fetchMeliJson(`https://api.mercadolibre.com/trends/${site}`);
    response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    response.status(200).json({
      site,
      trends,
      tokenRefreshed: Boolean(refreshedToken),
      nextStep: refreshedToken ? "Update MELI_ACCESS_TOKEN in Vercel with the refreshed token." : undefined,
    });
  } catch (error) {
    response.status(error.status || 502).json({
      error: "Mercado Libre request failed",
      status: error.status,
      detail: error.message,
      tokenRefreshed: Boolean(error.refreshedToken),
      refreshedAccessToken: error.refreshedToken || undefined,
      message:
        error.status === 403
          ? "Mercado Libre rechazo la consulta. Si refreshedAccessToken aparece, actualiza MELI_ACCESS_TOKEN en Vercel."
          : "No se pudo consultar Mercado Libre en este momento.",
    });
  }
}
