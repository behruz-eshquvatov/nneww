import axios from 'axios'

const DEFAULT_TIMEOUT_MS = Number.parseInt(
  process.env.SD_REQUEST_TIMEOUT_MS || '15000',
  10,
)
const DEFAULT_PAGE_LIMIT = 100
const SESSION_TTL_MS = Number.parseInt(
  process.env.SD_SESSION_TTL_MS || '300000',
  10,
)
const DEALER_CONFIG_BASE_URL =
  (process.env.DEALER_CONFIG_BASE_URL || 'http://45.94.209.80:8005').trim()
const DEALER_INFO_PATH = (process.env.DEALER_INFO_PATH || '/api/dealers/info')
  .trim()
  .replace(/\/+$/g, '')
const sessionCache = new Map()

const createHttpError = (status, message, details) => {
  const error = new Error(message)
  error.status = status

  if (details) {
    error.details = details
  }

  return error
}

const normalizeApiUrl = (value) => {
  if (!value) {
    return ''
  }

  return value.endsWith('/') ? value : `${value}/`
}

const resolveDealerInfoUrl = (dealerId) => {
  const baseUrl = DEALER_CONFIG_BASE_URL.replace(/\/+$/g, '')

  return `${baseUrl}${DEALER_INFO_PATH}/${encodeURIComponent(dealerId)}/`
}

const buildSalesDoctorClient = (config) =>
  axios.create({
    baseURL: normalizeApiUrl(config.url),
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: DEFAULT_TIMEOUT_MS,
  })

const buildEntityRef = (value) => ({
  CS_id: value?.CS_id ?? null,
  SD_id: value?.SD_id ?? null,
  code_1C: value?.code_1C ?? null,
})

const resolveEntityId = (value) =>
  value?.CS_id || value?.SD_id || value?.code_1C || ''

const callSalesDoctor = async (client, payload) => {
  try {
    const { data } = await client.post('', payload)

    if (!data || data.status === false) {
      throw createHttpError(
        502,
        data?.error?.message || `SalesDoctor ${payload.method} failed.`,
        data?.error || data,
      )
    }

    return data
  } catch (error) {
    if (error.status) {
      throw error
    }

    if (error.response?.data) {
      const remotePayload = error.response.data

      throw createHttpError(
        error.response.status || 502,
        remotePayload?.error?.message || `SalesDoctor ${payload.method} failed.`,
        remotePayload,
      )
    }

    throw createHttpError(
      502,
      error.message || `SalesDoctor ${payload.method} request failed.`,
    )
  }
}

const loadPaginatedCollection = async ({
  client,
  method,
  auth,
  collectionKey,
}) => {
  const items = []
  let page = 1

  while (true) {
    const payload = await callSalesDoctor(client, {
      method,
      auth,
      params: {
        page,
        limit: DEFAULT_PAGE_LIMIT,
      },
    })

    const currentPageItems = Array.isArray(payload?.result?.[collectionKey])
      ? payload.result[collectionKey]
      : []

    items.push(...currentPageItems)

    const total = Number.parseInt(payload?.pagination?.total, 10)

    if (!Number.isFinite(total) || items.length >= total || currentPageItems.length === 0) {
      return items
    }

    page += 1
  }
}

const resolveAbsoluteAssetUrl = (assetPath, apiUrl) => {
  if (!assetPath) {
    return ''
  }

  try {
    return new URL(assetPath, apiUrl).toString()
  } catch {
    return assetPath
  }
}

const buildEntityNameLookup = (items) =>
  new Map(
    items.flatMap((item) => {
      const id = item?.id || resolveEntityId(item)

      if (!id) {
        return []
      }

      return [[id, item.name || '']]
    }),
  )

const buildPriceLookup = (prices) =>
  new Map(
    prices.flatMap((entry) => {
      const entity = entry?.product
      const ids = [entity?.CS_id, entity?.SD_id, entity?.code_1C].filter(Boolean)

      return ids.map((id) => [id, Number(entry?.price) || 0])
    }),
  )

const resolvePriceTypeScore = (priceType) => {
  const name = (priceType?.name || '').toLowerCase()

  if (name.includes('розниц') || name.includes('retail')) {
    return 3
  }

  if (priceType?.active === 'Y') {
    return 2
  }

  return 1
}

export const getDealerConfig = async (dealerId) => {
  if (!dealerId) {
    throw createHttpError(400, 'Dealer ID is required.')
  }

  try {
    const { data } = await axios.get(resolveDealerInfoUrl(dealerId), {
      timeout: DEFAULT_TIMEOUT_MS,
    })

    if (!data?.url || !data?.login || !data?.password) {
      throw createHttpError(
        502,
        'Dealer config response is missing url, login, or password.',
      )
    }

    return {
      url: normalizeApiUrl(data.url),
      login: data.login,
      password: data.password,
    }
  } catch (error) {
    if (error.status) {
      throw error
    }

    if (error.response?.status === 404) {
      throw createHttpError(404, `Dealer "${dealerId}" was not found.`)
    }

    throw createHttpError(
      error.response?.status || 502,
      error.response?.data?.error ||
        error.message ||
        'Failed to load dealer config.',
    )
  }
}

export const loginToSalesDoctor = async (config) => {
  const client = buildSalesDoctorClient(config)
  const payload = await callSalesDoctor(client, {
    method: 'login',
    auth: {
      login: config.login,
      password: config.password,
    },
  })

  const token = payload?.result

  if (!token?.userId || !token?.token) {
    throw createHttpError(502, 'SalesDoctor login did not return a valid token.')
  }

  return token
}

export const getSalesDoctorSession = async (dealerId) => {
  const cachedSession = sessionCache.get(dealerId)

  if (cachedSession && cachedSession.expiresAt > Date.now()) {
    return cachedSession
  }

  const config = await getDealerConfig(dealerId)
  const token = await loginToSalesDoctor(config)
  const session = {
    config,
    token,
    expiresAt: Date.now() + SESSION_TTL_MS,
  }

  sessionCache.set(dealerId, session)
  return session
}

export const getCategories = async (token, config) => {
  const client = buildSalesDoctorClient(config)

  return loadPaginatedCollection({
    client,
    method: 'getProductCategory',
    auth: token,
    collectionKey: 'productCategory',
  })
}

export const getSubcategories = async (token, config) => {
  const client = buildSalesDoctorClient(config)

  return loadPaginatedCollection({
    client,
    method: 'getProductSubCategory',
    auth: token,
    collectionKey: 'subCategory',
  })
}

export const getProducts = async (token, config) => {
  const client = buildSalesDoctorClient(config)

  return loadPaginatedCollection({
    client,
    method: 'getProduct',
    auth: token,
    collectionKey: 'product',
  })
}

export const getPriceTypes = async (token, config) => {
  const client = buildSalesDoctorClient(config)

  return loadPaginatedCollection({
    client,
    method: 'getPriceType',
    auth: token,
    collectionKey: 'priceType',
  })
}

export const pickDefaultPriceType = (priceTypes) => {
  if (!Array.isArray(priceTypes) || priceTypes.length === 0) {
    return null
  }

  return [...priceTypes].sort(
    (left, right) => resolvePriceTypeScore(right) - resolvePriceTypeScore(left),
  )[0]
}

export const getPrices = async (token, config, { product, priceType }) => {
  if (!product || !priceType) {
    return []
  }

  const client = buildSalesDoctorClient(config)
  const payload = await callSalesDoctor(client, {
    method: 'getPrice',
    auth: token,
    params: {
      product: buildEntityRef(product),
      priceType: buildEntityRef(priceType),
    },
  })

  return Array.isArray(payload?.result) ? payload.result : []
}

export const normalizeCategories = (categories) =>
  categories
    .map((category) => ({
      id: resolveEntityId(category),
      name: category?.name || '',
      active: category?.active === 'Y',
      entity: buildEntityRef(category),
    }))
    .filter((category) => category.id && category.name)

export const normalizeSubcategories = (subCategories) =>
  subCategories
    .map((subCategory) => ({
      id: resolveEntityId(subCategory),
      name: subCategory?.name || '',
      categoryId: resolveEntityId(subCategory?.category),
      active: subCategory?.active === 'Y',
      entity: buildEntityRef(subCategory),
    }))
    .filter((subCategory) => subCategory.id && subCategory.name)

export const normalizeProducts = ({
  products,
  categories,
  subCategories,
  prices,
  config,
}) => {
  const categoryNameById = buildEntityNameLookup(normalizeCategories(categories))
  const subCategoryNameById = buildEntityNameLookup(normalizeSubcategories(subCategories))
  const priceByProductId = buildPriceLookup(prices)

  return products
    .map((product) => {
      const id = resolveEntityId(product)
      const categoryId = resolveEntityId(product?.category)
      const subCategoryId = resolveEntityId(product?.subCategory)

      return {
        id,
        name: product?.name || 'Unnamed product',
        code:
          product?.code_1C ||
          product?.part_number ||
          product?.sapCode ||
          product?.SD_id ||
          product?.CS_id ||
          '',
        barcode: product?.barCode || '',
        price: priceByProductId.get(id) || 0,
        image: resolveAbsoluteAssetUrl(
          product?.imageUrl || product?.thumbUrl || '',
          config.url,
        ),
        categoryId,
        subCategoryId,
        category: categoryNameById.get(categoryId) || '',
        subCategory: subCategoryNameById.get(subCategoryId) || '',
        entity: buildEntityRef(product),
      }
    })
    .filter((product) => product.id)
}
