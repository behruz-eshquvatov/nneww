import heroImage from '../assets/hero.png'
import {
  salesDocAssetBaseEndpoint,
  salesDocProductsEndpoint,
} from './env'

const compactText = (value) =>
  typeof value === 'string' ? value.trim() : ''

const resolveAbsoluteAssetUrl = (assetPath) => {
  const normalizedPath = compactText(assetPath)

  if (!normalizedPath) {
    return ''
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath
  }

  if (!salesDocAssetBaseEndpoint) {
    return normalizedPath
  }

  try {
    return new URL(normalizedPath, salesDocAssetBaseEndpoint).toString()
  } catch {
    return normalizedPath
  }
}

const resolveDynamicPriceKey = (value) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return compactText(String(value))
  }

  return compactText(value?.CS_id || value?.SD_id || value?.code_1C || value?.id)
}

const resolveProductPrice = (product) => {
  const dynamicPriceKey = resolveDynamicPriceKey(product?.price_type || product?.priceType)
  const priceCandidates = [
    product?.price,
    product?.salePrice,
    product?.priceValue,
    product?.amount,
    product?.summa,
    dynamicPriceKey ? product?.[dynamicPriceKey] : undefined,
    dynamicPriceKey ? product?.raw?.[dynamicPriceKey] : undefined,
  ]

  for (const candidate of priceCandidates) {
    const parsed = Number(candidate)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

const parseJsonResponse = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.details || payload?.error || fallbackMessage)
  }

  return payload
}

const postJson = (url) =>
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

const resolveEntityId = (value) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return compactText(String(value))
  }

  return compactText(value?.CS_id || value?.SD_id || value?.code_1C || value?.id)
}

const resolveEntityName = (value) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return compactText(String(value))
  }

  return compactText(
    value?.name ||
      value?.title ||
      value?.productCategoryName ||
      value?.productSubCategoryName ||
      value?.categoryName ||
      value?.subCategoryName,
  )
}

const normalizeCategory = (category) => {
  const name = resolveEntityName(category)
  const id = resolveEntityId(category) || name

  return id && name ? { id, name } : null
}

const normalizeSubCategory = (subCategory, categoryNameById) => {
  const name = resolveEntityName(subCategory)
  const id = resolveEntityId(subCategory) || name
  const parentCategory =
    subCategory?.category || subCategory?.productCategory || subCategory?.parentCategory
  const categoryId = resolveEntityId(parentCategory) || resolveEntityName(parentCategory)

  return id && name
    ? {
        id,
        name,
        categoryId,
        category: categoryNameById.get(categoryId) || resolveEntityName(parentCategory),
      }
    : null
}

const resolveProductCategory = (product) =>
  product?.category ||
  product?.productCategory ||
  product?.categoryData ||
  product?.productCategoryName ||
  product?.categoryName ||
  null

const resolveProductSubCategory = (product) =>
  product?.subCategory ||
  product?.subcategory ||
  product?.productSubCategory ||
  product?.subCategoryData ||
  product?.productSubCategoryName ||
  product?.subCategoryName ||
  null

const normalizeProduct = (product, categoryNameById, subCategoryNameById) => {
  const id = resolveEntityId(product)
  const categorySource = resolveProductCategory(product)
  const subCategorySource = resolveProductSubCategory(product)
  const categoryName = resolveEntityName(categorySource)
  const subCategoryName = resolveEntityName(subCategorySource)
  const categoryId = resolveEntityId(categorySource) || categoryName
  const subCategoryId = resolveEntityId(subCategorySource) || subCategoryName

  if (!id) {
    return null
  }

  return {
    id,
    name: compactText(product?.name) || 'Nomsiz mahsulot',
    code:
      compactText(product?.code_1C) ||
      compactText(product?.part_number) ||
      compactText(product?.sapCode) ||
      compactText(product?.SD_id) ||
      compactText(product?.CS_id),
    barcode: compactText(product?.barCode),
    price: resolveProductPrice(product),
    image:
      resolveAbsoluteAssetUrl(product?.imageUrl || product?.thumbUrl) || heroImage,
    thumbImage: resolveAbsoluteAssetUrl(product?.thumbUrl),
    stockLevel: Number(product?.volume) || 0,
    packQuantity: Number(product?.packQuantity) || 0,
    categoryId,
    subCategoryId,
    category: categoryNameById.get(categoryId) || categoryName || "Boshqa bo'lim",
    subCategory: subCategoryNameById.get(subCategoryId) || subCategoryName,
    raw: product,
  }
}

const buildUniqueCollection = (items, getKey) => {
  const seen = new Set()

  return items.filter((item) => {
    const key = compactText(getKey(item))

    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

const buildCategoriesFromProducts = (products) =>
  buildUniqueCollection(
    products
      .map((product) => {
        const name = compactText(product?.category)
        const id = compactText(product?.categoryId) || name

        return name ? { id, name } : null
      })
      .filter(Boolean),
    (item) => item.id || item.name,
  )

const buildSubCategoriesFromProducts = (products) =>
  buildUniqueCollection(
    products
      .map((product) => {
        const name = compactText(product?.subCategory)
        const id = compactText(product?.subCategoryId) || name

        if (!name) {
          return null
        }

        return {
          id,
          name,
          categoryId: compactText(product?.categoryId) || compactText(product?.category),
          category: compactText(product?.category),
        }
      })
      .filter(Boolean),
    (item) => item.id || item.name,
  )

const readSalesDocProducts = (payload) => {
  if (Array.isArray(payload?.products)) {
    return payload.products
  }

  if (Array.isArray(payload?.result?.products)) {
    return payload.result.products
  }

  if (Array.isArray(payload?.result?.product)) {
    return payload.result.product
  }

  if (Array.isArray(payload?.result)) {
    return payload.result
  }

  return []
}

export const loadSalesDocProducts = async () => {
  const productsResponse = await postJson(salesDocProductsEndpoint)
  const productsPayload = await parseJsonResponse(
    productsResponse,
    "SalesDoc katalogini yuklab bo'lmadi.",
  )

  const categories = Array.isArray(productsPayload?.result?.productCategory)
    ? productsPayload.result.productCategory
    : []
  const subCategories = Array.isArray(productsPayload?.result?.productSubCategory)
    ? productsPayload.result.productSubCategory
    : []
  const products = readSalesDocProducts(productsPayload)
  const normalizedCategories = categories.map(normalizeCategory).filter(Boolean)
  const categoryNameById = new Map(normalizedCategories.map((item) => [item.id, item.name]))
  const normalizedSubCategories = subCategories
    .map((item) => normalizeSubCategory(item, categoryNameById))
    .filter(Boolean)
  const subCategoryNameById = new Map(
    normalizedSubCategories.map((item) => [item.id, item.name]),
  )
  const normalizedProducts = products
    .map((product) => normalizeProduct(product, categoryNameById, subCategoryNameById))
    .filter(Boolean)
  const derivedCategories = buildCategoriesFromProducts(normalizedProducts)
  const derivedSubCategories = buildSubCategoriesFromProducts(normalizedProducts)

  return {
    categories: buildUniqueCollection(
      [...normalizedCategories, ...derivedCategories],
      (item) => item.id || item.name,
    ),
    subCategories: buildUniqueCollection(
      [...normalizedSubCategories, ...derivedSubCategories],
      (item) => item.id || item.name,
    ),
    products: normalizedProducts,
  }
}
