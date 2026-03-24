import { Search, ShoppingCart } from 'lucide-react'
import { useDeferredValue, useEffect, useState } from 'react'
import CartDrawer from '../components/CartDrawer'
import Pagination from '../components/Pagination'
import ProductCard from '../components/ProductCard'
import QuantityDialog from '../components/QuantityDialog'
import { appConfig } from '../lib/env'
import { formatCount } from '../lib/format'
import { getFallbackCatalog, loadCatalog, submitOrder } from '../lib/salesDoctor'

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
  const [page, setPage] = useState(1)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [quantityState, setQuantityState] = useState({
    isOpen: false,
    product: null,
    initialQuantity: 1,
  })
  const [customerForm, setCustomerForm] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

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
  }, [deferredSearch])

  const filteredProducts = products.filter((product) => {
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

  const openQuantity = (product) => {
    const existingItem = cart.find((item) => item.id === product.id)

    setQuantityState({
      isOpen: true,
      product,
      initialQuantity: existingItem?.quantity || 1,
    })
  }

  const closeQuantity = () =>
    setQuantityState({
      isOpen: false,
      product: null,
      initialQuantity: 1,
    })

  const upsertCartItem = (product, quantity) => {
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

    setStatus({
      tone: 'success',
      text: `${product.name} savatga ${quantity} ta qilib saqlandi.`,
    })

    setCartOpen(true)
    closeQuantity()
  }

  const removeFromCart = (productId) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== productId))
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
          <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold text-app-text">
            {appConfig.title}
          </h1>

          <label className="relative w-full md:max-w-sm">
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
              {formatCount(filteredProducts.length)}ta mahsulot
            </p>
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
                  onOpenQuantity={openQuantity}
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

      <QuantityDialog
        key={`${quantityState.product?.id || 'empty'}-${quantityState.initialQuantity}-${quantityState.isOpen ? 'open' : 'closed'}`}
        isOpen={quantityState.isOpen}
        product={quantityState.product}
        initialQuantity={quantityState.initialQuantity}
        onClose={closeQuantity}
        onConfirm={upsertCartItem}
      />

      <CartDrawer
        isOpen={cartOpen}
        cart={cart}
        customerForm={customerForm}
        isSubmitting={isSubmitting}
        onClose={() => setCartOpen(false)}
        onEditItem={openQuantity}
        onRemoveItem={removeFromCart}
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
