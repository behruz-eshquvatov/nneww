# NewTujjors

Vite + React storefront with a SalesDoc proxy for local Express and Netlify Functions.

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

## Netlify

- Netlify `dist` bilan birga `netlify/functions` papkasidagi serverless endpointlarni ham deploy qiladi.
- Netlify environment variables ichida kamida `SALESDOC_BASE_URL`, `SALESDOC_LOGIN`, `SALESDOC_PASSWORD`, `VITE_SALESDOC_ASSET_BASE_URL` ni kiriting.
- `VITE_API_BASE_URL` ni Netlify'da bo'sh qoldiring yoki umuman bermang, shunda frontend shu domen ichidagi `/api/...` endpointlarga murojaat qiladi.
