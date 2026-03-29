import { Barcode, ShoppingCart, Trash2 } from 'lucide-react'
import { formatPrice } from '../lib/format'

const clampQuantity = (value) => {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}

export const ProductCardSkeleton = () => (
  <article
    className="card-radius max-w-125 mx-auto flex h-full w-full animate-pulse flex-col overflow-hidden border border-app-border bg-app-surface shadow-soft"
    aria-hidden="true"
  >
    <div className="relative w-full aspect-square overflow-hidden bg-app-surface-muted sm:h-56 md:h-64">
      <div className="absolute top-3 right-3 h-7 w-24 rounded-full bg-white/70" />
    </div>

    <div className="flex flex-1 flex-col p-3 md:p-4">
      <div className="min-h-0 flex-1">
        <div className="mt-3 h-5 w-4/5 rounded-full bg-app-surface-muted" />
        <div className="mt-2 h-5 w-3/5 rounded-full bg-app-surface-muted" />

        <div className="mt-4 flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-app-surface-muted" />
          <div className="h-4 w-2/3 rounded-full bg-app-surface-muted" />
        </div>
      </div>

      <div className="mt-4">
        <div className="h-4 w-12 rounded-full bg-app-surface-muted" />
        <div className="mt-2 h-6 w-28 rounded-full bg-app-surface-muted" />
      </div>

      <div className="mt-4 h-12 rounded-2xl bg-app-surface-muted" />
    </div>
  </article>
)

const ProductCard = ({
  product,
  priority = false,
  quantityInCart,
  isEditorOpen,
  editorQuantity,
  onOpenEditor,
  onCloseEditor,
  onChangeEditorQuantity,
  onAdjustEditorQuantity,
  onSaveQuantity,
  onRemoveFromCart,
}) => {
  const parsedQuantity = clampQuantity(editorQuantity)
  return (
    <article className="card-radius max-w-125 mx-auto flex h-full w-full flex-col overflow-hidden border border-app-border bg-app-surface shadow-soft">
      <div className="relative w-full aspect-square overflow-hidden bg-app-surface-muted">
        {product.packQuantity > 0 && !isEditorOpen && (
          <span className="absolute top-3 right-3 z-10 rounded-full bg-app-surface/95 px-3 py-1 text-xs font-semibold text-app-text shadow-sm backdrop-blur">
            Qadoq: {product.packQuantity} ta
          </span>
        )}

        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-semibold text-app-text-soft">
            Rasm mavjud emas
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 md:p-4">
        <div className="min-h-0 flex-1">
          {!isEditorOpen && (
            <>
              <h2 className="mt-3 line-clamp-2 text-sm font-bold text-app-text md:text-base">
                {product.name}
              </h2>

              <div className="mt-3 flex items-center gap-2 text-xs text-app-text-soft">
                <Barcode size={14} strokeWidth={2} />
                <span className="truncate">{product.barcode || 'mavjud emas'}</span>
              </div>
            </>
          )}
        </div>

        {!isEditorOpen && (
          <div className="mt-4">
            <p className="text-xs text-app-text-soft">Narx</p>
            <p className="text-sm font-extrabold text-app-text md:text-lg">
              {formatPrice(product.price)}
            </p>
          </div>
        )}

        <div className="mt-4">
          {isEditorOpen ? (
            <div className="">
              <div className="flex items-start justify-between gap-3">

                {quantityInCart > 0 && (
                  <button
                    type="button"
                    onClick={() => onRemoveFromCart(product.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-app-danger-soft px-3 py-2 text-xs font-semibold text-app-danger"
                  >
                    <Trash2 size={14} />
                    <span>Olib tashlash</span>
                  </button>
                )}
              </div>

              <div className="-mt-1 grid grid-cols-11 gap-2">
                {[ -5, -1].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onAdjustEditorQuantity(step)}
                    className="rounded-2xl border col-span-2 border-app-border bg-app-surface px-3 py-3 text-sm font-semibold text-app-text transition hover:bg-white"
                  >
                    {step}
                  </button>
                ))}

                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={editorQuantity}
                  onChange={(event) => onChangeEditorQuantity(event.target.value)}
                  className="col-span-3 rounded-2xl border border-app-border bg-app-surface px-4 py-4 text-center text-2xl font-extrabold text-app-text"
                />

                {[1, 5].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onAdjustEditorQuantity(step)}
                    className="rounded-2xl col-span-2 border border-app-border bg-app-surface px-3 py-3 text-sm font-semibold text-app-text transition hover:bg-white"
                  >
                    +{step}
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-2xl bg-app-surface px-4 py-3 text-sm text-app-text">
                Jami: <span className="font-extrabold">{formatPrice(product.price * parsedQuantity)}</span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onCloseEditor}
                  className="rounded-2xl border border-app-border px-4 py-3 text-sm font-semibold text-app-text"
                >
                  Bekor
                </button>
                <button
                  type="button"
                  onClick={() => onSaveQuantity(product)}
                  className="flex-1 rounded-2xl bg-app-accent px-4 py-3 text-sm font-bold text-app-accent-contrast transition hover:opacity-90"
                >
                  {quantityInCart > 0 ? 'Savatni yangilash' : "Savatga qo'shish"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenEditor(product)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition hover:opacity-90 ${
                quantityInCart > 0
                  ? 'border border-app-border bg-app-accent-soft text-app-text'
                  : 'bg-app-accent text-app-accent-contrast'
              }`}
            >
              <ShoppingCart size={16} strokeWidth={2.2} />
              <span>{quantityInCart > 0 ? `Savatda ${quantityInCart} ta` : 'Sotib olish'}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default ProductCard
