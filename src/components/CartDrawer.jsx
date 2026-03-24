import { NotebookText, Pencil, Phone, ShoppingCart, Trash2, User, X } from 'lucide-react'
import { formatCount, formatPrice } from '../lib/format'

const CartDrawer = ({
  isOpen,
  cart,
  customerForm,
  isSubmitting,
  onClose,
  onEditItem,
  onRemoveItem,
  onFieldChange,
  onSubmit,
}) => {
  if (!isOpen) {
    return null
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + item.quantity * item.price, 0)

  return (
    <div className="fixed inset-0 z-40 bg-black/35">
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl">
        <button
          type="button"
          aria-label="Close cart"
          onClick={onClose}
          className="hidden flex-1 md:block"
        />

        <aside className="flex h-full w-full flex-col border-l border-app-border bg-app-surface">
          <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-app-text-soft">
                <ShoppingCart size={14} />
                Savat
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-app-text">
                {formatCount(totalItems)} ta mahsulot
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-app-border p-2 text-app-text-soft"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {cart.length === 0 ? (
              <div className="card-radius flex h-full min-h-56 flex-col items-center justify-center border border-dashed border-app-border bg-app-surface-muted p-6 text-center">
                <ShoppingCart size={28} className="text-app-text-soft" />
                <p className="mt-3 text-lg font-bold text-app-text">Savat bo&apos;sh</p>
                <p className="mt-2 text-sm text-app-text-soft">
                  Mahsulotni sotib olish tugmasi orqali savatga qo&apos;shing.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="card-radius border border-app-border bg-app-surface-muted p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-app-text">{item.name}</h3>
                        <p className="mt-1 text-xs text-app-text-soft">{item.barcode || item.code}</p>
                      </div>
                      <p className="text-right text-sm font-extrabold text-app-text">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-app-text-soft">
                        {item.quantity} x {formatPrice(item.price)}
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-text"
                        >
                          <Pencil size={14} />
                          <span>O&apos;zgartirish</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-app-danger-soft px-3 py-2 text-xs font-semibold text-app-danger"
                        >
                          <Trash2 size={14} />
                          <span>Olib tashlash</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-app-text-soft">
                  <User size={14} />
                  Ism
                </span>
                <input
                  type="text"
                  value={customerForm.customerName}
                  onChange={(event) => onFieldChange('customerName', event.target.value)}
                  placeholder="Ixtiyoriy"
                  className="w-full rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text"
                />
              </label>

              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-app-text-soft">
                  <Phone size={14} />
                  Telefon
                </span>
                <input
                  type="tel"
                  value={customerForm.customerPhone}
                  onChange={(event) => onFieldChange('customerPhone', event.target.value)}
                  placeholder="+998"
                  className="w-full rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text"
                />
              </label>

              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-app-text-soft">
                  <NotebookText size={14} />
                  Izoh
                </span>
                <textarea
                  rows="3"
                  value={customerForm.note}
                  onChange={(event) => onFieldChange('note', event.target.value)}
                  placeholder="Buyurtma uchun izoh"
                  className="w-full rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-app-border px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-app-text-soft">Jami</span>
              <span className="text-xl font-extrabold text-app-text">
                {formatPrice(totalPrice)}
              </span>
            </div>

            <button
              type="button"
              onClick={onSubmit}
              disabled={!cart.length || isSubmitting}
              className="w-full rounded-2xl bg-app-accent px-4 py-4 text-base font-bold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Yuborilmoqda...' : 'Buyurtmani yuborish'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CartDrawer
