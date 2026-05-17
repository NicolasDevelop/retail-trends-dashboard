# Retail Trends Radar

Dashboard para explorar productos tendencia reales desde Mercado Libre, filtrar oportunidades de retail y calcular utilidad estimada por producto.

## Funciones

- Ranking de productos generado desde Mercado Libre Trends + Search.
- Filtros por busqueda, categoria, canal y score minimo.
- Senales de tendencia por crecimiento de demanda.
- Vista de oportunidades por categoria.
- Calculadora de utilidad con costo, fee y envio.
- Exportacion CSV.
- Proxy serverless para consultar Mercado Libre sin exponer credenciales en el frontend.

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

Mercado Libre puede responder `403` sin autenticacion. Configura `MELI_ACCESS_TOKEN` como variable de entorno en Vercel antes de usar datos reales.

Variables de entorno:

```txt
MELI_ACCESS_TOKEN=tu_access_token_de_mercado_libre
```

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
  README.md
```
