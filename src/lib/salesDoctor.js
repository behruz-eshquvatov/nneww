import {
  appConfig,
  getMissingOrderConfig,
  hasDirectAuth,
  hasLoginAuth,
  isEntityConfigured,
  salesDoctorConfig,
} from './env'

export const DEFAULT_PRODUCT_IMAGE =
  'https://cdn.thewirecutter.com/wp-content/media/2026/03/BG-IPHONE-5323.jpg?width=2048&quality=60&crop=2048:1365&auto=webp'

const fallbackCategories = [
  { category: 'Smartphones', subCategory: 'Flagship' },
  { category: 'Accessories', subCategory: 'Cases' },
  { category: 'Gadgets', subCategory: 'Wearables' },
]

const sampleProducts = Array.from({ length: 20 }, (_, index) => {
  const itemNumber = String(index + 1).padStart(2, '0')
  const fallbackCategory = fallbackCategories[index % fallbackCategories.length]

  return {
    id: `demo-${itemNumber}`,
    name: 'Apple iPhone 15 Pro Max',
    code: `IPHONE-${itemNumber}`,
    shortCode: itemNumber,
    barcode: '1234567890123',
    price: 14999000,
    image: DEFAULT_PRODUCT_IMAGE,
    category: fallbackCategory.category,
    subCategory: fallbackCategory.subCategory,
    isActive: true,
    entity: {
      CS_id: `demo_${itemNumber}`,
      SD_id: `demo_${itemNumber}`,
      code_1C: `IPHONE-${itemNumber}`,
    },
  }
})

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== '' && entry != null),
  )

const buildEntityKey = (entity) =>
  entity.SD_id || entity.code_1C || entity.CS_id || ''

const normalizeEntity = (entity) => compactObject(entity)

const addEntityAliases = (map, entity, value) => {
  if (!value) {
    return
  }

  for (const key of [entity.CS_id, entity.SD_id, entity.code_1C]) {
    if (key) {
      map.set(String(key), value)
    }
  }
}

let authPromise = null

const getAuth = async () => {
  if (hasDirectAuth) {
    return salesDoctorConfig.directAuth
  }

  if (!hasLoginAuth) {
    throw new Error('Sales Doctor auth is missing. Fill the .env file first.')
  }

  if (!authPromise) {
    authPromise = fetch(salesDoctorConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'login',
        auth: salesDoctorConfig.loginAuth,
      }),
    })
      .then(async (response) => {
        const payload = await response.json()

        if (!response.ok || !payload.status) {
          throw new Error(payload.error?.message || 'Sales Doctor login failed.')
        }

        return payload.result
      })
      .catch((error) => {
        authPromise = null
        throw error
      })
  }

  return authPromise
}

const callSalesDoctor = async ({
  apiMethod,
  params,
  data,
  includeFilial = true,
  httpMethod = 'POST',
}) => {
  if (!salesDoctorConfig.apiUrl) {
    throw new Error('VITE_SD_API_URL is missing.')
  }

  const auth = await getAuth()
  const payload = {
    auth,
    method: apiMethod,
  }

  if (includeFilial && salesDoctorConfig.filialId) {
    payload.filial = {
      filial_id: Number.isNaN(Number(salesDoctorConfig.filialId))
        ? salesDoctorConfig.filialId
        : Number(salesDoctorConfig.filialId),
    }
  }

  if (params) {
    payload.params = params
  }

  if (data) {
    payload.data = data
  }

  const response = await fetch(salesDoctorConfig.apiUrl, {
    method: httpMethod,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  if (!response.ok || result.status === false) {
    throw new Error(result.error?.message || `Sales Doctor ${apiMethod} failed.`)
  }

  return result.result
}

export const loadCatalog = async () => {
  const canLoadLiveCatalog =
    Boolean(salesDoctorConfig.apiUrl) && (hasDirectAuth || hasLoginAuth)

  if (!canLoadLiveCatalog) {
    return getFallbackCatalog().products
  }

  const requestMethod =
    salesDoctorConfig.readHttpMethod === 'GET' ? 'POST' : salesDoctorConfig.readHttpMethod

  const productParams = {
    page: 1,
    limit: 500,
  }

  if (isEntityConfigured(salesDoctorConfig.trade)) {
    productParams.filter = {
      trade: normalizeEntity(salesDoctorConfig.trade),
    }
  }

  const requests = [
    callSalesDoctor({
      apiMethod: 'getProduct',
      params: productParams,
      httpMethod: requestMethod,
    }),
    callSalesDoctor({
      apiMethod: 'getProductSubCategory',
      params: {
        page: 1,
        limit: 100,
      },
      httpMethod: requestMethod,
    }).catch(() => ({ subCategory: [] })),
    callSalesDoctor({
      apiMethod: 'getProductGroup',
      params: {
        page: 1,
        limit: 100,
      },
      httpMethod: requestMethod,
    }).catch(() => ({ productGroup: [] })),
  ]

  if (isEntityConfigured(salesDoctorConfig.priceType)) {
    requests.push(
      callSalesDoctor({
        apiMethod: 'getPrice',
        params: {
          priceType: normalizeEntity(salesDoctorConfig.priceType),
        },
        includeFilial: false,
        httpMethod: requestMethod,
      }).catch(() => []),
    )
  } else {
    requests.push(Promise.resolve([]))
  }

  const [productResult, subCategoryResult, productGroupResult, priceResult] =
    await Promise.all(requests)

  const priceMap = new Map(
    (Array.isArray(priceResult) ? priceResult : []).map((entry) => [
      buildEntityKey(entry.product || {}),
      Number(entry.price) || 0,
    ]),
  )

  const subCategoryMap = new Map()
  const productGroupMap = new Map()

  for (const subCategory of subCategoryResult.subCategory || []) {
    addEntityAliases(
      subCategoryMap,
      {
        CS_id: subCategory.CS_id || '',
        SD_id: subCategory.SD_id || '',
        code_1C: subCategory.code_1C || '',
      },
      subCategory.name || '',
    )
  }

  for (const productGroup of productGroupResult.productGroup || []) {
    addEntityAliases(
      productGroupMap,
      {
        CS_id: productGroup.CS_id || '',
        SD_id: productGroup.SD_id || '',
        code_1C: productGroup.code_1C || '',
      },
      productGroup.name || '',
    )
  }

  return (productResult.product || [])
    .filter((product) => product.active === 'Y' || product.active === true)
    .map((product, index) => {
      const fallbackCategory = fallbackCategories[index % fallbackCategories.length]
      const entity = {
        CS_id: product.CS_id || '',
        SD_id: product.SD_id || '',
        code_1C: product.code_1C || '',
      }

      const resolvedSubCategory =
        subCategoryMap.get(String(product.subCategory?.SD_id || '')) ||
        subCategoryMap.get(String(product.subCategory?.code_1C || '')) ||
        subCategoryMap.get(String(product.subCategory?.CS_id || '')) ||
        product.subCategory?.name ||
        ''

      const resolvedCategory =
        productGroupMap.get(String(product.productGroup?.SD_id || '')) ||
        productGroupMap.get(String(product.productGroup?.code_1C || '')) ||
        productGroupMap.get(String(product.productGroup?.CS_id || '')) ||
        product.category?.name ||
        product.brand?.name ||
        resolvedSubCategory ||
        fallbackCategory.category

      return {
        id: buildEntityKey(entity),
        name: product.name || 'Nomsiz mahsulot',
        code: product.code_1C || product.SD_id || product.CS_id || 'NO-CODE',
        barcode: product.barCode || product.code_1C || product.SD_id || product.CS_id || '',
        shortCode:
          (product.code_1C || product.SD_id || product.CS_id || '000')
            .toString()
            .slice(-6),
        price: priceMap.get(buildEntityKey(entity)) ?? 0,
        image: DEFAULT_PRODUCT_IMAGE,
        category: resolvedCategory,
        subCategory:
          resolvedSubCategory && resolvedSubCategory !== resolvedCategory
            ? resolvedSubCategory
            : '',
        isActive: product.active === 'Y' || product.active === true,
        entity,
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
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
    `Savat: ${cart
      .map((item) => `${item.name} x ${item.quantity}`)
      .join(', ')}`,
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

export const submitOrder = async ({ cart, customerName, customerPhone, note }) => {
  const missing = getMissingOrderConfig()

  if (missing.length > 0) {
    return {
      status: true,
      demo: true,
      missing,
      savedCart: cart,
      customerName,
      customerPhone,
      note,
    }
  }

  if (!cart.length) {
    throw new Error("Savatingiz hozircha bo'sh.")
  }

  const order = {
    code_1C: createOrderCode(),
    status: 1,
    comment: buildComment({ customerName, customerPhone, note, cart }),
    client: normalizeEntity(salesDoctorConfig.order.client),
    agent: normalizeEntity(salesDoctorConfig.order.agent),
    priceType: normalizeEntity(salesDoctorConfig.priceType),
    warehouse: normalizeEntity(salesDoctorConfig.order.warehouse),
    orderProducts: cart.map((item) => ({
      product: normalizeEntity(item.entity),
      quantity: item.quantity,
      price: Number(item.price) || 0,
      discountSumma: 0,
    })),
  }

  if (isEntityConfigured(salesDoctorConfig.trade)) {
    order.trade = normalizeEntity(salesDoctorConfig.trade)
  }

  return callSalesDoctor({
    apiMethod: 'setOrder',
    data: {
      order: [order],
    },
    includeFilial: true,
    httpMethod: 'POST',
  })
}

export const getFallbackCatalog = () => ({
  products: sampleProducts,
  message: `${appConfig.title} demo katalogi yuklandi. .env sozlangach haqiqiy Sales Doctor mahsulotlari chiqadi.`,
})
