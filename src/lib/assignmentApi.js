import heroImage from '../assets/hero.png'

const ASSIGNMENT_API_BASE_URL = 'http://45.94.209.80:8005'
const ASSIGNMENT_ENDPOINT_PREFIX = `${ASSIGNMENT_API_BASE_URL}/api/dealers/assignment/`
const ASSIGNMENT_ORDER_ENDPOINT = `${ASSIGNMENT_API_BASE_URL}/api/dealers/assignment-order/`

const compactText = (value) =>
  typeof value === 'string' ? value.trim() : ''

const resolveRouteAssignmentCode = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  const segments = window.location.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  return decodeURIComponent(segments[0] || '')
}

const parseJsonResponse = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => null)

  if (!response.ok || payload?.status === false) {
    throw new Error(
      payload?.details || payload?.error || payload?.message || fallbackMessage,
    )
  }

  return payload
}

const normalizeCategories = (products) => {
  const seen = new Set()
  const categories = []

  for (const product of products) {
    const categoryName = compactText(product.category) || "Boshqa bo'lim"

    if (seen.has(categoryName)) {
      continue
    }

    seen.add(categoryName)
    categories.push({ name: categoryName })
  }

  return categories
}

const normalizeProducts = (products) =>
  (Array.isArray(products) ? products : []).map((product, index) => {
    const id = String(product?.id ?? `product-${index + 1}`)
    const category = compactText(product?.category) || "Boshqa bo'lim"
    const company = compactText(product?.company)

    return {
      id,
      sortId: index + 1,
      name: compactText(product?.name) || 'Nomsiz mahsulot',
      code: id,
      barcode: '',
      category,
      subCategory: company,
      price: Number(product?.sale_price) || 0,
      image: compactText(product?.photo) || heroImage,
      company,
      raw: product,
    }
  })

export const loadAssignmentCatalogFromRoute = async () => {
  const assignmentCode = resolveRouteAssignmentCode()

  if (!assignmentCode) {
    throw new Error('URL ichida assignment code topilmadi. Masalan: /A8824E28')
  }

  const endpoint = `${ASSIGNMENT_ENDPOINT_PREFIX}${encodeURIComponent(assignmentCode)}/`
  const payload = await parseJsonResponse(
    await fetch(endpoint, { method: 'GET' }),
    'Assignment katalogini yuklab bo‘lmadi.',
  )

  if (payload?.is_active === false) {
    throw new Error(`Assignment ${assignmentCode} faol emas.`)
  }

  const products = normalizeProducts(payload?.products)
  const categories = normalizeCategories(products)

  return {
    assignmentCode,
    assignmentId: payload?.id ?? null,
    couriers: Array.isArray(payload?.couriers) ? payload.couriers : [],
    products,
    categories,
  }
}

export const buildAssignmentOrderPayload = ({ assignmentCode, customer, cart }) => {
  const customerName = compactText(customer?.customerName)
  const normalizedDigits = compactText(customer?.customerPhone).replace(/\D/g, '')
  const items = (Array.isArray(cart) ? cart : []).map((item) => ({
    product_id: Number(item?.id) || item?.raw?.id || item?.id,
    id: Number(item?.id) || item?.raw?.id || item?.id,
    name: compactText(item?.name),
    quantity: Number(item?.quantity) || 0,
    sale_price: Number(item?.price) || 0,
    price: Number(item?.price) || 0,
  }))

  return {
    assignment_code: assignmentCode,
    code: assignmentCode,
    customer_name: customerName,
    customer_phone: normalizedDigits,
    name: customerName,
    phone: normalizedDigits,
    items,
    products: items,
    cart: items,
  }
}

export const submitAssignmentOrder = async (payload) =>
  parseJsonResponse(
    await fetch(ASSIGNMENT_ORDER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }),
    'Buyurtmani yuborib bo‘lmadi.',
  )
