import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import CartDrawer from '../components/CartDrawer'
import Pagination from '../components/Pagination'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard'
import StoreHeader, {
  ALL_CATEGORIES,
  ALL_SUBCATEGORIES,
} from '../components/StoreHeader.jsx'
import { formatCount } from '../lib/format'
import { loadSalesDocProducts } from '../lib/salesDoc'
import { staticCategories, staticProducts } from '../lib/staticStore'

const ITEMS_PER_PAGE = 6
const EMPTY_FORM = {
  customerName: '',
  customerPhone: '',
  note: '',
}

const ToneClasses = {
  info: 'border-app-border bg-app-surface text-app-text',
  success: 'border-app-accent bg-app-accent-soft text-app-text',
  error: 'border-app-danger bg-app-danger-soft text-app-danger',
}

const clampQuantity = (value) => {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}

const EmptyGrid = ({ searchTerm }) => (
  <div className="card-radius flex h-full min-h-0 flex-col items-center justify-center border border-dashed border-app-border bg-app-surface p-8 text-center">
    <h2 className="text-2xl font-extrabold text-app-text">Mahsulot topilmadi</h2>
    <p className="mt-3 max-w-md text-sm leading-6 text-app-text-soft">
      {searchTerm
        ? `"${searchTerm}" bo'yicha natija chiqmagan.`
        : "Hozircha ko'rsatish uchun mahsulot yo'q."}
    </p>
  </div>
)

const LoadingGrid = () => (
  <>
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
        <ProductCardSkeleton key={`loading-card-${index}`} />
      ))}
    </div>

    <div className="mt-4 shrink-0">
      <div
        className="card-radius h-12 animate-pulse border border-app-border bg-app-surface-muted/80"
        aria-hidden="true"
      />
    </div>
  </>
)

const StorePage = () => {
  const fallbackCategories = useMemo(() => staticCategories, [])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [isProductsLoading, setIsProductsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const [selectedSubCategory, setSelectedSubCategory] = useState(ALL_SUBCATEGORIES)
  const [page, setPage] = useState(1)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [quantityEditor, setQuantityEditor] = useState({
    productId: null,
    quantity: '1',
  })
  const [customerForm, setCustomerForm] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  const deferredSearch = useDeferredValue(search.trim().toLowerCase())

  useEffect(() => {
    let cancelled = false

    const fetchProducts = async () => {
      try {
        setIsProductsLoading(true)
        setStatus({
          tone: 'info',
          text: "SalesDoc mahsulotlari yuklanmoqda...",
        })

        const salesDocData = await loadSalesDocProducts()

        if (cancelled) {
          return
        }

        setProducts(salesDocData.products)
        setCategories(salesDocData.categories)
        setStatus({
          tone: 'success',
          text: `${formatCount(salesDocData.products.length)} ta mahsulot SalesDoc orqali yuklandi.`,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setProducts(staticProducts)
        setCategories(fallbackCategories)
        setStatus({
          tone: 'error',
          text:
            error instanceof Error
              ? `${error.message} Statik mahsulotlar ko'rsatildi.`
              : "SalesDoc ulanmagan. Statik mahsulotlar ko'rsatildi.",
        })
      } finally {
        if (!cancelled) {
          setIsProductsLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [fallbackCategories])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, selectedCategory, selectedSubCategory])

  const selectedFilterLabel =
    selectedCategory === ALL_CATEGORIES
      ? "Barcha bo'limlar"
      : selectedSubCategory !== ALL_SUBCATEGORIES
        ? `${selectedCategory} / ${selectedSubCategory}`
        : selectedCategory

  const filteredProducts = products.filter((product) => {
    if (selectedCategory !== ALL_CATEGORIES && product.category !== selectedCategory) {
      return false
    }

    if (
      selectedSubCategory !== ALL_SUBCATEGORIES &&
      product.subCategory !== selectedSubCategory
    ) {
      return false
    }

    if (!deferredSearch) {
      return true
    }

    const haystack = `${product.name} ${product.code} ${product.barcode || ''}`.toLowerCase()
    return haystack.includes(deferredSearch)
  })

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const currentProducts = filteredProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  )
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const selectAllCategories = () => {
    setSelectedCategory(ALL_CATEGORIES)
    setSelectedSubCategory(ALL_SUBCATEGORIES)
  }

  const selectCategory = (category) => {
    setSelectedCategory(category)
    setSelectedSubCategory(ALL_SUBCATEGORIES)
  }

  const openQuantityEditor = (product) => {
    const existingItem = cart.find((item) => item.id === product.id)

    setQuantityEditor({
      productId: product.id,
      quantity: String(existingItem?.quantity || 1),
    })
  }

  const closeQuantityEditor = () =>
    setQuantityEditor({
      productId: null,
      quantity: '1',
    })

  const updateCartItem = (product, nextQuantity, options = {}) => {
    const { announce = false } = options
    const quantity = clampQuantity(nextQuantity)

    setCart((currentCart) => {
      const nextItem = {
        ...product,
        quantity,
      }

      const existingIndex = currentCart.findIndex((item) => item.id === product.id)

      if (existingIndex === -1) {
        return [...currentCart, nextItem]
      }

      const copy = [...currentCart]
      copy[existingIndex] = nextItem
      return copy
    })

    if (announce) {
      setStatus({
        tone: 'success',
        text: `${product.name} savatga ${quantity} ta qilib saqlandi.`,
      })
    }
  }

  const changeEditorQuantity = (value) => {
    setQuantityEditor((currentEditor) => ({
      ...currentEditor,
      quantity: value,
    }))
  }

  const adjustEditorQuantity = (step) => {
    setQuantityEditor((currentEditor) => ({
      ...currentEditor,
      quantity: String(Math.max(1, clampQuantity(currentEditor.quantity) + step)),
    }))
  }

  const saveEditorQuantity = (product) => {
    updateCartItem(product, quantityEditor.quantity, { announce: true })
    closeQuantityEditor()
  }

  const removeFromCart = (productId) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== productId))

    setQuantityEditor((currentEditor) =>
      currentEditor.productId === productId
        ? {
            productId: null,
            quantity: '1',
          }
        : currentEditor,
    )
  }

  const adjustCartItemQuantity = (product, step) => {
    const currentQuantity = cart.find((item) => item.id === product.id)?.quantity || 1
    updateCartItem(product, Math.max(1, currentQuantity + step))
  }

  const updateCartItemQuantity = (product, nextQuantity) => {
    updateCartItem(product, nextQuantity)
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      await new Promise((resolve) => window.setTimeout(resolve, 350))

      const payload = {
        customer: customerForm,
        cart,
        createdAt: new Date().toISOString(),
      }

      window.localStorage.setItem('new-tujjors-last-order', JSON.stringify(payload))

      setCart([])
      setCartOpen(false)
      closeQuantityEditor()
      setCustomerForm(EMPTY_FORM)
      setStatus({
        tone: 'success',
        text: "Buyurtma brauzerda mahalliy saqlandi. Hech qanday API ishlatilmadi.",
      })
    } catch (error) {
      setStatus({
        tone: 'error',
        text: error.message || 'Buyurtmani mahalliy saqlashda xatolik yuz berdi.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden bg-app-bg">
      <StoreHeader
        categories={categories}
        products={products}
        search={search}
        onSearchChange={setSearch}
        totalItems={totalItems}
        onOpenCart={() => setCartOpen(true)}
        selectedCategory={selectedCategory}
        selectedSubCategory={selectedSubCategory}
        onSelectAllCategories={selectAllCategories}
        onSelectCategory={selectCategory}
      />

      <section className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col overflow-hidden px-4 py-4">
        {status && (
          <div
            className={`card-radius mb-4 shrink-0 border px-4 py-3 text-sm font-medium ${ToneClasses[status.tone]}`}
          >
            {status.text}
          </div>
        )}

        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-app-text">
              {formatCount(filteredProducts.length)} ta mahsulot
            </p>
            <p className="text-sm text-app-text-soft">{selectedFilterLabel}</p>
          </div>
          {isProductsLoading && (
            <p className="text-sm font-medium text-app-text-soft">Yuklanmoqda...</p>
          )}
        </div>

        {isProductsLoading ? (
          <LoadingGrid />
        ) : filteredProducts.length === 0 ? (
          <EmptyGrid searchTerm={search} />
        ) : (
          <>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {currentProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={cart.find((item) => item.id === product.id)?.quantity || 0}
                  isEditorOpen={quantityEditor.productId === product.id}
                  editorQuantity={
                    quantityEditor.productId === product.id ? quantityEditor.quantity : '1'
                  }
                  onOpenEditor={openQuantityEditor}
                  onCloseEditor={closeQuantityEditor}
                  onChangeEditorQuantity={changeEditorQuantity}
                  onAdjustEditorQuantity={adjustEditorQuantity}
                  onSaveQuantity={saveEditorQuantity}
                  onRemoveFromCart={removeFromCart}
                />
              ))}

              {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - currentProducts.length) }).map(
                (_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="card-radius hidden h-[24rem] border border-dashed border-app-border bg-app-surface/50 lg:block"
                    aria-hidden="true"
                  />
                ),
              )}
            </div>

            <div className="mt-4 shrink-0">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </section>

      <CartDrawer
        isOpen={cartOpen}
        cart={cart}
        customerForm={customerForm}
        isSubmitting={isSubmitting}
        onClose={() => setCartOpen(false)}
        onAdjustItemQuantity={adjustCartItemQuantity}
        onRemoveItem={removeFromCart}
        onUpdateItemQuantity={updateCartItemQuantity}
        onFieldChange={(field, value) =>
          setCustomerForm((currentForm) => ({
            ...currentForm,
            [field]: value,
          }))
        }
        onSubmit={handleSubmit}
      />
    </main>
  )
}

export default StorePage
