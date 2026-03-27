# NewTujjors

Frontend endi SalesDoctor bilan to'g'ridan-to'g'ri brauzerdan emas, Express proxy orqali ishlaydi. Shu sabab `url`, `login`, `password`, `token` kabi ma'lumotlar brauzerga chiqmaydi.

## Ishga tushirish

1. `.env.example` asosida `.env` tayyorlang.
2. Backend uchun `ALLOWED_ORIGINS` va `DEALER_CONFIG_BASE_URL` ni kiriting.
3. Agar backend boshqa domenda host qilinsa, frontend uchun `VITE_API_BASE_URL` ni o'sha backend URL ga sozlang.
4. `npm run dev` ni ishga tushiring.

`npm run dev` bir vaqtda:

- Vite clientni
- Express proxy serverni

ishga tushiradi.

## Muhim env lar

Frontend:

- `VITE_APP_TITLE`
- `VITE_APP_SUBTITLE`
- `VITE_APP_CURRENCY`
- `VITE_API_BASE_URL`

Backend:

- `PORT`
- `ALLOWED_ORIGINS`
- `DEALER_CONFIG_BASE_URL`
- `DEALER_INFO_PATH`
- `SD_REQUEST_TIMEOUT_MS`
- `SD_SESSION_TTL_MS`

## URL ishlashi

- `http://localhost:5173/tvMxtrl0zP`
- `https://dreamy-sable-f225e2.netlify.app/tvMxtrl0zP`

Frontend `dealerId` ni URL pathname ichidagi birinchi segmentdan oladi va backendga quyidagi endpointlar orqali murojaat qiladi:

- `/api/store/:dealerId/categories`
- `/api/store/:dealerId/products`
- `/api/store/:dealerId/subcategories`

## Build

- `npm run build` client build qiladi
- `npm run start` Express serverni ko'taradi
