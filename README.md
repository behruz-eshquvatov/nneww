# NewTujjors

Vite + React storefront with an Express proxy for SalesDoc.

## Ishga tushirish

1. `.env.example` asosida `.env` yarating.
2. `npm install` ishlating.
3. `npm run dev` ishlating.

`npm run dev` endi Vite client va Express serverni birga ishga tushiradi, backend fayllari o'zgarsa server avtomatik restart bo'ladi.

## API

- Frontend mahsulotlarni bitta endpoint orqali yuklaydi:
- `POST /api/salesdoc/products`

## Env

- `VITE_APP_TITLE`
- `VITE_APP_SUBTITLE`
- `VITE_APP_CURRENCY`
- `VITE_API_BASE_URL`
- `VITE_SALESDOC_ASSET_BASE_URL`
- `SALESDOC_BASE_URL`
- `SALESDOC_LOGIN`
- `SALESDOC_PASSWORD`

## Build

- `npm run build`
- `npm run preview`
