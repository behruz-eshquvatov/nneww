# NewTujjors

Vite + React asosidagi assignment storefront.

## Ishga tushirish

1. `npm install`
2. `npm run dev`

## Build

1. `npm run build`
2. `npm run preview`

## Sozlamalar (ixtiyoriy)

- `VITE_API_BASE_URL` - API base URL (default: bo'sh, ya'ni joriy origin)

## Eslatma

- Route ichidagi birinchi segment assignment code sifatida olinadi.
- Masalan: `/A8824E28` ochilganda katalog `GET /api/dealers/assignment/A8824E28/` dan olinadi.
- Buyurtma `POST /api/dealers/assignment-order/` ga yuboriladi.
