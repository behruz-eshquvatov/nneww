import { Router } from 'express'
import {
  getCategories,
  getPriceTypes,
  getPrices,
  getProducts,
  getSalesDoctorSession,
  getSubcategories,
  normalizeCategories,
  normalizeProducts,
  normalizeSubcategories,
  pickDefaultPriceType,
} from '../services/salesdoctor.service.js'

const router = Router()

router.get('/:dealerId/categories', async (request, response, next) => {
  try {
    const { dealerId } = request.params
    const { config, token } = await getSalesDoctorSession(dealerId)
    const categories = await getCategories(token, config)

    response.json({
      dealerId,
      categories: normalizeCategories(categories),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:dealerId/subcategories', async (request, response, next) => {
  try {
    const { dealerId } = request.params
    const { config, token } = await getSalesDoctorSession(dealerId)
    const subCategories = await getSubcategories(token, config)

    response.json({
      dealerId,
      subCategories: normalizeSubcategories(subCategories),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:dealerId/products', async (request, response, next) => {
  try {
    const { dealerId } = request.params
    const { config, token } = await getSalesDoctorSession(dealerId)
    const products = await getProducts(token, config)
    const categories = await getCategories(token, config)
    const subCategories = await getSubcategories(token, config)
    const priceTypes = await getPriceTypes(token, config)
    const defaultPriceType = pickDefaultPriceType(priceTypes)

    const prices =
      products.length > 0 && defaultPriceType
        ? await getPrices(token, config, {
          product: products[0],
          priceType: defaultPriceType,
        })
        : []

    response.json({
      dealerId,
      products: normalizeProducts({
        products,
        categories,
        subCategories,
        prices,
        config,
      }),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/:dealerId/orders', async (_request, response) => {
  response.status(501).json({
    error:
      'Order submission is not implemented in the new SalesDoctor proxy yet.',
  })
})

export default router
