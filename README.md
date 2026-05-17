# Retail Trends Radar

Dashboard para explorar productos tendencia reales desde Mercado Libre, filtrar oportunidades de retail y calcular utilidad estimada por producto.

## Funciones

- Ranking de productos generado desde Mercado Libre Trends + Search.
- Enriquecimiento con publicaciones, precios, envio gratis, seller y reputacion cuando Mercado Libre lo permite.
- Filtros por busqueda, categoria, canal y score minimo.
- Senales de tendencia por crecimiento de demanda.
- Vista de oportunidades por categoria.
- Calculadora de utilidad con costo, fee y envio.
- Exportacion CSV.
- Proxy serverless para consultar Mercado Libre sin exponer credenciales en el frontend.
- Fallback tolerante: si un endpoint de enriquecimiento falla, el dashboard conserva tendencias disponibles.

## Ejecutar localmente

La interfaz puede abrirse localmente, pero los datos reales requieren las funciones `/api/*`, por lo que el modo recomendado es Vercel.

Tambien puedes servirlo con cualquier servidor estatico:

```bash
python -m http.server 8080
```

Luego visita `http://localhost:8080`.

## Deploy

### GitHub Pages

No recomendado para la version con datos reales. GitHub Pages no ejecuta `api/products.js`.

### Vercel

Recomendado. No requiere build command.

Endpoints disponibles:

- `/api/trends?site=MLC`
- `/api/products?site=MLC&limit=12`
- `/api/auth/start`
- `/api/auth/callback`
- `/api/auth/refresh`
- `/api/debug/meli`

Mercado Libre puede responder `403` sin autenticacion. La API intenta usar `MELI_ACCESS_TOKEN`; si no existe, intenta generar un token con `MELI_CLIENT_ID` y `MELI_CLIENT_SECRET`.

Variables de entorno:

```txt
MELI_CLIENT_ID=client_id_de_tu_app
MELI_CLIENT_SECRET=client_secret_de_tu_app
MELI_REDIRECT_URI=https://retail-trends-dashboard.vercel.app/api/auth/callback
MELI_ACCESS_TOKEN=opcional_si_ya_generaste_un_token_oauth
MELI_REFRESH_TOKEN=refresh_token_generado_por_oauth
MELI_TOKEN_EXPIRES_AT=fecha_iso_informativa
```

Flujo para obtener token:

1. En Mercado Libre Developers configura Redirect URI:
   `https://retail-trends-dashboard.vercel.app/api/auth/callback`
2. En Vercel agrega `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET` y `MELI_REDIRECT_URI`.
3. Haz redeploy.
4. Abre `/api/auth/start`.
5. Autoriza la app.
6. Copia `MELI_ACCESS_TOKEN` desde la pantalla de callback a Vercel.
7. Haz redeploy nuevamente.

Renovar token:

1. Abre `/api/auth/refresh`.
2. Copia `MELI_ACCESS_TOKEN`, `MELI_REFRESH_TOKEN` y `MELI_TOKEN_EXPIRES_AT`.
3. Actualiza esas variables en Vercel.
4. Haz redeploy.

La API tambien intenta refrescar automaticamente cuando Mercado Libre responde 401 o 403. En serverless no puede guardar variables de entorno por si sola, asi que el endpoint `/api/auth/refresh` sirve para actualizar Vercel manualmente cuando sea necesario.

## Proximos pasos

1. Guardar snapshots diarios o semanales en una base simple.
2. Calcular crecimiento real comparando snapshots.
3. Agregar un conector para Google Shopping via SerpApi o DataForSEO.
4. Agregar alertas por productos nuevos o crecimiento alto.

## Estructura

```txt
retail-trends-dashboard/
  index.html
  styles.css
  app.js
  api-connectors.md
  api/products.js
  api/trends.js
  api/auth/start.js
  api/auth/callback.js
  api/auth/refresh.js
  README.md
```
