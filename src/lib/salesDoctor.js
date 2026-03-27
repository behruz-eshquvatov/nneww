import { apiConfig } from './env'

const apiBase = apiConfig.baseUrl
  ? `${apiConfig.baseUrl}/api`
  : '/api'

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== '' && entry != null),
  )

const parseJsonResponse = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => null)

  if (payload == null) {
    throw new Error('Server JSON javob qaytarmadi.')
  }

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage)
  }

  return payload
}

const buildStoreUrl = (dealerId, resource) =>
  `${apiBase}/store/${encodeURIComponent(dealerId)}/${resource}`

export const loadProducts = async (dealerId) => {
  const response = await fetch(buildStoreUrl(dealerId, 'products'))
  const payload = await parseJsonResponse(
    response,
    'Mahsulotlarni yuklashda xatolik yuz berdi.',
  )

  return Array.isArray(payload.products) ? payload.products : []
}

export const loadCategories = async (dealerId) => {
  const response = await fetch(buildStoreUrl(dealerId, 'categories'))
  const payload = await parseJsonResponse(
    response,
    'Kategoriyalarni yuklashda xatolik yuz berdi.',
  )

  return Array.isArray(payload.categories) ? payload.categories : []
}

export const loadSubCategories = async (dealerId) => {
  const response = await fetch(buildStoreUrl(dealerId, 'subcategories'))
  const payload = await parseJsonResponse(
    response,
    'Subkategoriyalarni yuklashda xatolik yuz berdi.',
  )

  return Array.isArray(payload.subCategories) ? payload.subCategories : []
}

const buildComment = ({ customerName, customerPhone, note, cart }) => {
  const lines = []

  if (customerName) {
    lines.push(`Mijoz: ${customerName}`)
  }

  if (customerPhone) {
    lines.push(`Telefon: ${customerPhone}`)
  }

  if (note) {
    lines.push(`Izoh: ${note}`)
  }

  lines.push(
    `Savat: ${cart.map((item) => `${item.name} x ${item.quantity}`).join(', ')}`,
  )

  return lines.join(' | ')
}

const createOrderCode = () => {
  const now = new Date()
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')

  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()

  return `WEB-${stamp}-${randomPart}`
}

export const submitOrder = async ({
  dealerId,
  cart,
  customerName,
  customerPhone,
  note,
}) => {
  if (!cart.length) {
    throw new Error("Savatingiz hozircha bo'sh.")
  }

  if (!dealerId) {
    throw new Error('Dealer ID topilmadi.')
  }

  const response = await fetch(buildStoreUrl(dealerId, 'orders'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cart: cart.map((item) => ({
        ...compactObject(item),
        entity: compactObject(item.entity || {}),
      })),
      customerName,
      customerPhone,
      note,
      clientMeta: {
        code: createOrderCode(),
        comment: buildComment({ customerName, customerPhone, note, cart }),
        dealerId,
      },
    }),
  })

  return parseJsonResponse(response, 'Buyurtmani yuborishda xatolik yuz berdi.')
}
