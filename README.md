# Retail Trends Radar

Dashboard estatico para explorar productos tendencia, filtrar oportunidades de retail y calcular utilidad estimada por producto.

## Funciones

- Ranking de productos por score comercial.
- Filtros por busqueda, categoria, canal y score minimo.
- Senales de tendencia por crecimiento de demanda.
- Vista de oportunidades por categoria.
- Calculadora de utilidad con costo, fee y envio.
- Exportacion CSV.
- Base preparada para conectar Mercado Libre, Google Shopping o fuentes propias.

## Ejecutar localmente

Abre `index.html` en el navegador.

Tambien puedes servirlo con cualquier servidor estatico:

```bash
python -m http.server 8080
```

Luego visita `http://localhost:8080`.

## Deploy

### GitHub Pages

1. Sube la carpeta a un repositorio.
2. En GitHub, abre `Settings > Pages`.
3. Elige la rama principal y la carpeta raiz.
4. Publica.

### Netlify o Vercel

Usa deploy de sitio estatico. No requiere build command.

En Vercel tambien puedes usar `api/trends.js` como proxy para Mercado Libre. Si necesitas autenticacion, configura la variable `MELI_ACCESS_TOKEN` en el panel del proyecto.

## Proximos pasos de datos reales

1. Crear una funcion serverless `/api/trends` para llamar Mercado Libre Trends.
2. Guardar snapshots diarios o semanales en una base simple.
3. Calcular crecimiento comparando snapshots.
4. Agregar un conector para Google Shopping via SerpApi o DataForSEO.
5. Reemplazar el array demo de `app.js` por datos del endpoint propio.

## Estructura

```txt
retail-trends-dashboard/
  index.html
  styles.css
  app.js
  api-connectors.md
  README.md
```
