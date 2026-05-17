# Retail Trends Radar

Dashboard para detectar productos tendencia en retail usando datos reales de Mercado Libre y enriquecimiento opcional de Google Shopping via SerpApi.

## Estado actual

El proyecto esta funcionando en Vercel con este flujo:

- Mercado Libre Trends entrega tendencias reales para Chile (`MLC`).
- Mercado Libre Search esta bloqueado para esta app/token (`403`), por lo que no se usa como fuente confiable de precios.
- SerpApi Google Shopping enriquece las primeras 6 tendencias con precio, tienda, rating, reviews y rango de precios.
- Las tendencias restantes quedan como `Mercado Libre Trends` y muestran `Sin detalle` en campos comerciales.
- El dashboard mantiene fallback: si una fuente falla, conserva los datos disponibles en vez de romper la pantalla.

## Fuentes de datos

### Mercado Libre

Usado para demanda/tendencias:

```txt
GET /api/trends?site=MLC
GET /api/products?site=MLC&limit=12
```

Internamente consulta:

```txt
https://api.mercadolibre.com/trends/MLC
https://api.mercadolibre.com/categories/{CATEGORY_ID}
https://api.mercadolibre.com/users/me
```

Mercado Libre Search:

```txt
https://api.mercadolibre.com/sites/MLC/search?q=...
```

Actualmente responde `403` con este token/app, por eso el proyecto usa SerpApi para precios.

### SerpApi Google Shopping

Usado para enriquecer tendencias cuando Mercado Libre no entrega publicaciones:

```txt
https://serpapi.com/search?engine=google_shopping
```

Variable requerida:

```txt
SERPAPI_API_KEY
```

Para cuidar cuota, el proyecto enriquece hasta 6 tendencias por request:

```txt
SHOPPING_ENRICH_LIMIT = 6
```

## Funciones del dashboard

- Ranking de productos tendencia.
- Filtros por busqueda, categoria, canal y score minimo.
- Senales de demanda.
- Vista de oportunidades por categoria.
- Precios desde Google Shopping cuando estan disponibles.
- Rango de precios: minimo, promedio y maximo.
- Tienda/seller principal.
- Rating y reviews cuando la fuente los entrega.
- Calculadora de utilidad con precio, costo, fee y envio.
- Exportacion CSV.
- Diagnostico de APIs.
- OAuth con Mercado Libre.
- Renovacion manual/asistida de token.

## Deploy recomendado

Usar Vercel.

Configuracion:

```txt
Framework Preset: Other
Root Directory: ./
Build Command: vacio
Output Directory: vacio
Install Command: vacio
```

GitHub Pages no es recomendado para la version real porque no ejecuta funciones `/api/*`.

## Variables de entorno

Configurar en Vercel:

```txt
MELI_CLIENT_ID=client_id_de_mercado_libre
MELI_CLIENT_SECRET=client_secret_de_mercado_libre
MELI_REDIRECT_URI=https://retail-trends-dashboard.vercel.app/api/auth/callback
MELI_ACCESS_TOKEN=access_token_generado_por_oauth
MELI_REFRESH_TOKEN=refresh_token_generado_por_oauth
MELI_TOKEN_EXPIRES_AT=fecha_iso_informativa
SERPAPI_API_KEY=api_key_de_serpapi
```

`MELI_TOKEN_EXPIRES_AT` es informativa. La app no depende de ella para funcionar.

## OAuth Mercado Libre

Redirect URI configurada:

```txt
https://retail-trends-dashboard.vercel.app/api/auth/callback
```

Flujo:

1. Crear app en Mercado Libre Developers.
2. Configurar la Redirect URI anterior.
3. Configurar `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET` y `MELI_REDIRECT_URI` en Vercel.
4. Hacer redeploy.
5. Abrir:

```txt
https://retail-trends-dashboard.vercel.app/api/auth/start
```

6. Autorizar la app.
7. Copiar `MELI_ACCESS_TOKEN` y `MELI_REFRESH_TOKEN` desde la pantalla de callback.
8. Pegarlos en Vercel.
9. Hacer redeploy.

## Renovar token

El access token de Mercado Libre expira. Para renovarlo:

```txt
https://retail-trends-dashboard.vercel.app/api/auth/refresh
```

Luego copiar a Vercel:

```txt
MELI_ACCESS_TOKEN=...
MELI_REFRESH_TOKEN=...
MELI_TOKEN_EXPIRES_AT=...
```

Y hacer redeploy.

La API tambien intenta refrescar el token durante una request si Mercado Libre responde `401` o `403`, pero una funcion serverless no puede guardar variables de entorno de forma permanente. Por eso existe `/api/auth/refresh`.

## Endpoints

```txt
GET /api/products?site=MLC&limit=12
GET /api/trends?site=MLC
GET /api/debug/meli
GET /api/auth/start
GET /api/auth/callback
GET /api/auth/refresh
GET|POST /api/notifications
```

### Diagnostico

Abrir:

```txt
https://retail-trends-dashboard.vercel.app/api/debug/meli
```

Respuesta esperada:

```json
{
  "env": {
    "hasClientId": true,
    "hasClientSecret": true,
    "hasAccessToken": true,
    "hasRefreshToken": true,
    "hasRedirectUri": true,
    "hasSerpApiKey": true
  },
  "checks": {
    "user": { "status": 200 },
    "trends": { "status": 200 },
    "search": { "status": 403 },
    "category": { "status": 200 }
  }
}
```

`search: 403` es una restriccion de Mercado Libre para este endpoint/app. El sistema lo compensa con SerpApi.

## Diagnostico de productos

`/api/products` devuelve un bloque `diagnostics`:

```json
{
  "trends": 12,
  "enriched": 0,
  "googleShopping": 6,
  "trendOnly": 6,
  "searchLimit": 5,
  "shoppingEnrichLimit": 6,
  "hasSerpApiKey": true
}
```

Significado:

- `trends`: tendencias reales obtenidas desde Mercado Libre.
- `enriched`: productos enriquecidos por Mercado Libre Search.
- `googleShopping`: tendencias enriquecidas por SerpApi Google Shopping.
- `trendOnly`: tendencias sin precio/detalle comercial.
- `hasSerpApiKey`: confirma si Vercel tiene `SERPAPI_API_KEY`.

## Cache

El frontend llama:

```txt
/api/products?site=MLC&limit=12&v=shopping-v1
```

Ese parametro evita que el navegador/Vercel mantenga una respuesta antigua despues de cambios importantes.

Para probar manualmente una respuesta fresca:

```txt
https://retail-trends-dashboard.vercel.app/api/products?site=MLC&limit=12&t=prueba1
```

## Rollback

Antes del enriquecimiento se dejo un tag remoto:

```txt
rollback-before-enrichment
```

Para volver a ese estado:

```bash
git reset --hard rollback-before-enrichment
git push --force
```

Usar solo si la version enriquecida falla y se quiere volver al estado Mercado Libre Trends + OAuth.

## Estructura

```txt
retail-trends-dashboard/
  index.html
  styles.css
  app.js
  api-connectors.md
  vercel.json
  api/
    products.js
    trends.js
    notifications.js
    debug/
      meli.js
    lib/
      meli.js
    auth/
      start.js
      callback.js
      refresh.js
  README.md
```

## Proximos pasos

- Guardar snapshots diarios/semanales para medir crecimiento real.
- Agregar base de datos para historico.
- Subir `SHOPPING_ENRICH_LIMIT` si hay suficiente cuota SerpApi.
- Agregar DataForSEO como segunda alternativa de precios.
- Crear alertas para tendencias nuevas o cambios fuertes de precio.
