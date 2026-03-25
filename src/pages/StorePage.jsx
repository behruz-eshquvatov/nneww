import { ChevronRight, Menu, Search, ShoppingCart, X } from 'lucide-react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import CartDrawer from '../components/CartDrawer'
import Pagination from '../components/Pagination'
import ProductCard from '../components/ProductCard'
import { formatCount } from '../lib/format'
import { getFallbackCatalog, loadCatalog, submitOrder } from '../lib/salesDoctor'

const ITEMS_PER_PAGE = 6
const ALL_CATEGORIES = 'All'
const ALL_SUBCATEGORIES = 'All'
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

const buildCategoryTree = (products) => {
  const categoryMap = new Map()

  for (const product of products) {
    const categoryName = product.category || 'Boshqa'
    const subCategoryName = product.subCategory || ''

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        name: categoryName,
        count: 0,
        subCategories: new Map(),
      })
    }

    const categoryEntry = categoryMap.get(categoryName)
    categoryEntry.count += 1

    if (subCategoryName && subCategoryName !== categoryName) {
      categoryEntry.subCategories.set(
        subCategoryName,
        (categoryEntry.subCategories.get(subCategoryName) || 0) + 1,
      )
    }
  }

  return Array.from(categoryMap.values())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((category) => ({
      name: category.name,
      count: category.count,
      subCategories: Array.from(category.subCategories, ([name, count]) => ({
        name,
        count,
      })).sort((left, right) => left.name.localeCompare(right.name)),
    }))
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

const StorePage = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const [selectedSubCategory, setSelectedSubCategory] = useState(ALL_SUBCATEGORIES)
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState(null)
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
  const categoryTriggerRef = useRef(null)
  const categoryDrawerRef = useRef(null)

  const deferredSearch = useDeferredValue(search.trim().toLowerCase())

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      try {
        setLoading(true)
        const result = await loadCatalog()

        if (!isMounted) {
          return
        }

        if (!result.length) {
          const fallback = getFallbackCatalog()
          setProducts(fallback.products)
          setStatus({
            tone: 'info',
            text: fallback.message,
          })
          return
        }

        setProducts(result)
      } catch {
        if (!isMounted) {
          return
        }

        const fallback = getFallbackCatalog()
        setProducts(fallback.products)
        setStatus({
          tone: 'info',
          text: fallback.message,
        })
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, selectedCategory, selectedSubCategory])

  useEffect(() => {
    if (!categoryMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      const clickedTrigger = categoryTriggerRef.current?.contains(event.target)
      const clickedDrawer = categoryDrawerRef.current?.contains(event.target)

      if (!clickedTrigger && !clickedDrawer) {
        setCategoryMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setCategoryMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [categoryMenuOpen])

  const categoryTree = buildCategoryTree(products)
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

  const toggleCategoryMenu = () => {
    const nextOpen = !categoryMenuOpen
    setCategoryMenuOpen(nextOpen)

    if (nextOpen && selectedCategory !== ALL_CATEGORIES) {
      setExpandedCategory(selectedCategory)
    }
  }

  const selectAllCategories = () => {
    setSelectedCategory(ALL_CATEGORIES)
    setSelectedSubCategory(ALL_SUBCATEGORIES)
    setExpandedCategory(null)
    setCategoryMenuOpen(false)
  }

  const selectCategory = (category) => {
    setSelectedCategory(category)
    setSelectedSubCategory(ALL_SUBCATEGORIES)
    setExpandedCategory(category)
    setCategoryMenuOpen(false)
  }

  const selectSubCategory = (category, subCategory) => {
    setSelectedCategory(category)
    setSelectedSubCategory(subCategory)
    setExpandedCategory(category)
    setCategoryMenuOpen(false)
  }

  const toggleCategorySection = (category) => {
    setExpandedCategory((current) => (current === category ? null : category))
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
      <header className="shrink-0 border-b border-app-border bg-app-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-4 md:flex-nowrap">
          <div ref={categoryTriggerRef} className="w-full md:w-auto">
            <button
              type="button"
              onClick={toggleCategoryMenu}
              aria-label="Open categories"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-surface text-app-text"
            >
              <Menu size={18} />
            </button>
          </div>

          <label className="relative w-full md:flex-1">
            <span className="sr-only">Qidirish</span>
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-app-text-soft"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nomi yoki bar kod"
              className="w-full rounded-2xl border border-app-border bg-app-surface-muted py-3 pr-4 pl-11 text-sm text-app-text"
            />
          </label>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-app-accent px-4 py-3 text-sm font-bold text-app-accent-contrast"
          >
            <ShoppingCart size={18} />
            <span>Savat {totalItems > 0 ? `(${formatCount(totalItems)})` : ''}</span>
          </button>
        </div>
      </header>

      {categoryMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/35">
          <div className="flex h-full">
            <aside
              ref={categoryDrawerRef}
              className="flex h-full w-full max-w-sm flex-col border-r border-app-border bg-app-surface shadow-soft"
            >
              <div className="flex items-start justify-between gap-3 border-b border-app-border px-5 py-4">
                <div>
                  <p className="text-sm font-extrabold text-app-text">Kategoriyalar</p>
                  <p className="mt-1 text-xs text-app-text-soft">
                    Asosiy bo&apos;lim va ichki bo&apos;limni tanlang
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCategoryMenuOpen(false)}
                  className="rounded-full border border-app-border p-2 text-app-text-soft"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <button
                  type="button"
                  onClick={selectAllCategories}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedCategory === ALL_CATEGORIES
                      ? 'border-app-accent bg-app-accent text-app-accent-contrast shadow-soft'
                      : 'border-app-border bg-app-surface-muted text-app-text'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-bold">Barchasi</span>
                      <span
                        className={`mt-1 block text-xs ${
                          selectedCategory === ALL_CATEGORIES
                            ? 'text-app-accent-contrast/80'
                            : 'text-app-text-soft'
                        }`}
                      >
                        Hamma mahsulotlarni ko&apos;rsatish
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        selectedCategory === ALL_CATEGORIES
                          ? 'bg-white/20 text-app-accent-contrast'
                          : 'bg-app-surface text-app-text-soft'
                      }`}
                    >
                      {formatCount(products.length)}
                    </span>
                  </span>
                </button>

                <div className="mt-3 space-y-2">
                  {categoryTree.map((category) => {
                    const hasChildren = category.subCategories.length > 0
                    const isExpanded = expandedCategory === category.name
                    const isCategoryActive =
                      selectedCategory === category.name &&
                      selectedSubCategory === ALL_SUBCATEGORIES
                    const hasActiveChild =
                      selectedCategory === category.name &&
                      selectedSubCategory !== ALL_SUBCATEGORIES

                    return (
                      <div
                        key={category.name}
                        className="rounded-2xl border border-app-border bg-app-surface-muted"
                      >
                        <div className="flex items-center gap-2 p-2">
                          <button
                            type="button"
                            onClick={() => selectCategory(category.name)}
                            className={`flex-1 rounded-xl px-3 py-3 text-left transition ${
                              isCategoryActive
                                ? 'bg-app-accent text-app-accent-contrast shadow-soft'
                                : 'text-app-text hover:bg-app-surface'
                            }`}
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold">
                                  {category.name}
                                </span>
                                <span
                                  className={`mt-1 block text-xs ${
                                    isCategoryActive
                                      ? 'text-app-accent-contrast/80'
                                      : 'text-app-text-soft'
                                  }`}
                                >
                                  {hasChildren
                                    ? "Ichki bo'limlarni ochish yoki hammasini tanlash"
                                    : 'Bo&apos;limdagi mahsulotlar'}
                                </span>
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  isCategoryActive
                                    ? 'bg-white/20 text-app-accent-contrast'
                                    : 'bg-app-surface text-app-text-soft'
                                }`}
                              >
                                {formatCount(category.count)}
                              </span>
                            </span>
                          </button>

                          {hasChildren && (
                            <button
                              type="button"
                              onClick={() => toggleCategorySection(category.name)}
                              className={`rounded-xl border border-app-border bg-app-surface px-3 py-3 transition ${
                                isExpanded || hasActiveChild
                                  ? 'border-app-accent bg-app-accent-soft text-app-text'
                                  : 'text-app-text-soft'
                              }`}
                              aria-label={`${category.name} sub-kategoriyalarini ochish`}
                            >
                              <ChevronRight
                                size={18}
                                className={`transition-transform ${
                                  isExpanded || hasActiveChild ? 'rotate-90' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>

                        {(isExpanded || hasActiveChild) && hasChildren && (
                          <div className="border-t border-app-border px-2 pb-2">
                            <button
                              type="button"
                              onClick={() => selectCategory(category.name)}
                              className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                                isCategoryActive
                                  ? 'bg-app-accent font-semibold text-app-accent-contrast'
                                  : 'text-app-text-soft hover:bg-app-surface hover:text-app-text'
                              }`}
                            >
                              Hammasi
                            </button>

                            {category.subCategories.map((subCategory) => {
                              const isSubCategoryActive =
                                selectedCategory === category.name &&
                                selectedSubCategory === subCategory.name

                              return (
                                <button
                                  key={subCategory.name}
                                  type="button"
                                  onClick={() =>
                                    selectSubCategory(category.name, subCategory.name)
                                  }
                                  className={`mt-2 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                                    isSubCategoryActive
                                      ? 'bg-app-accent font-semibold text-app-accent-contrast'
                                      : 'text-app-text-soft hover:bg-app-surface hover:text-app-text'
                                  }`}
                                >
                                  <span className="truncate">{subCategory.name}</span>
                                  <span
                                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                      isSubCategoryActive
                                        ? 'bg-white/20 text-app-accent-contrast'
                                        : 'bg-app-surface text-app-text-soft'
                                    }`}
                                  >
                                    {formatCount(subCategory.count)}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </aside>

            <button
              type="button"
              onClick={() => setCategoryMenuOpen(false)}
              className="hidden flex-1 md:block"
              aria-label="Close categories"
            />
          </div>
        </div>
      )}

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
        </div>

        {loading ? (
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
