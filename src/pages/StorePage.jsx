import { useDeferredValue, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import CartDrawer from '../components/CartDrawer'
import Pagination from '../components/Pagination'
import ProductCard from '../components/ProductCard'
import StoreHeader, {
  ALL_CATEGORIES,
  ALL_SUBCATEGORIES,
} from '../components/StoreHeader.jsx'
import { isValidDealerId, resolveDealerId } from '../lib/dealer'
import { formatCount } from '../lib/format'
import { loadCategories, loadProducts, submitOrder } from '../lib/salesDoctor'

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

const LoadingGrid = () => (
  <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
      <div
        key={index}
        className="card-radius h-[24rem] animate-pulse border border-app-border bg-app-surface"
      />
    ))}
  </div>
)

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

const MissingDealerIdState = () => {
  const examplePath =
    typeof window !== 'undefined'
      ? `${window.location.origin}/tvMxtrl0zP`
      : '/tvMxtrl0zP'

  return (
    <div className="card-radius flex h-full min-h-0 flex-col items-center justify-center border border-dashed border-app-danger bg-app-danger-soft p-8 text-center">
      <h2 className="text-2xl font-extrabold text-app-danger">dealerId topilmadi</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-app-danger">
        Store sahifasi URL ichidagi birinchi segmentdan dealerId oladi. Masalan:
        {' '}
        {examplePath}
      </p>
    </div>
  )
}

const StorePage = () => {
  const { dealerId: routeDealerId } = useParams()
  const dealerId = resolveDealerId(routeDealerId)
  const hasDealerId = isValidDealerId(dealerId)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
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

    const loadStore = async () => {
      if (!hasDealerId) {
        setProducts([])
        setCategories([])
        setLoading(false)
        setStatus({
          tone: 'error',
          text: `Dealer ID topilmadi. Joriy pathname: ${
            typeof window !== 'undefined' ? window.location.pathname : '/'
          }`,
        })
        return
      }

      try {
        setLoading(true)
        setStatus({
          tone: 'info',
          text: `${dealerId} uchun katalog yuklanmoqda...`,
        })

        const nextCategories = await loadCategories(dealerId)
        const nextProducts = await loadProducts(dealerId)

        if (cancelled) {
          return
        }

        setCategories(nextCategories)
        setProducts(nextProducts)
        setStatus(
          nextProducts.length > 0
            ? {
              tone: 'success',
              text: `${dealerId} uchun ${formatCount(nextProducts.length)} ta mahsulot yuklandi.`,
            }
            : {
              tone: 'info',
              text: `${dealerId} uchun mahsulot topilmadi.`,
            },
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        setProducts([])
        setCategories([])
        setStatus({
          tone: 'error',
          text: error.message || 'Store maʼlumotlarini yuklashda xatolik yuz berdi.',
        })
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadStore()

    return () => {
      cancelled = true
    }
  }, [dealerId, hasDealerId])

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
      const result = await submitOrder({
        dealerId,
        cart,
        ...customerForm,
      })

      setCart([])
      setCartOpen(false)
      closeQuantityEditor()
      setCustomerForm(EMPTY_FORM)
      setStatus({
        tone: 'success',
        text: result?.demo
          ? "Demo rejimida buyurtma mahalliy saqlandi."
          : 'Buyurtma serverga yuborildi.',
      })
    } catch (error) {
      setStatus({
        tone: 'error',
        text: error.message || 'Buyurtmani yuborishda xatolik yuz berdi.',
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
            <p className="text-sm text-app-text-soft">
              {hasDealerId ? `${selectedFilterLabel} • dealerId: ${dealerId}` : selectedFilterLabel}
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingGrid />
        ) : !hasDealerId ? (
          <MissingDealerIdState />
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
