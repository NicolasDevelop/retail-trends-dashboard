# API connectors

Esta app consume datos reales desde funciones serverless cuando esta desplegada en Vercel.

## Mercado Libre

Fuentes utiles:

- Trends: `GET https://api.mercadolibre.com/trends/{SITE_ID}`
- Categorias: `GET https://api.mercadolibre.com/sites/{SITE_ID}/categories`
- Search: `GET https://api.mercadolibre.com/sites/{SITE_ID}/search?q={keyword}`

Sitios frecuentes:

- Chile: `MLC`
- Argentina: `MLA`
- Mexico: `MLM`
- Colombia: `MCO`
- Peru: `MPE`
- Uruguay: `MLU`
- Brasil: `MLB`

No pongas tokens privados en el frontend. Si un endpoint requiere `Authorization: Bearer`, usa una funcion serverless en Vercel, Netlify o Cloudflare Workers.

En este proyecto el token se lee desde:

```txt
MELI_ACCESS_TOKEN
```

Este proyecto incluye dos endpoints para Vercel:

```txt
/api/trends?site=MLC
/api/products?site=MLC&limit=12
```

`/api/products` combina Trends y Search para construir el ranking que consume el frontend.

## Google Shopping / SERP

Opciones:

- SerpApi Google Shopping Results API
- DataForSEO Merchant Google APIs

Estas fuentes sirven para comparar precios, tiendas, reviews y disponibilidad fuera de Mercado Libre.

## Modelo de datos sugerido

```json
{
  "name": "Freidora de aire 6 litros",
  "category": "Hogar",
  "channel": "Mercado Libre",
  "price": 74990,
  "growth": 28,
  "demand": 84,
  "margin": 24,
  "score": 88,
  "signal": "Demanda recurrente con baja barrera de compra"
}
```

## Score recomendado

```txt
score = demanda * 0.35 + crecimiento * 0.25 + margen * 0.20 + disponibilidad * 0.10 + estabilidad_precio * 0.10
```
