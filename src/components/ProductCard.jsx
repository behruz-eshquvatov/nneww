import { ShoppingCart } from 'lucide-react'
import { formatPrice, formatPriceValue } from '../lib/format'

const clampQuantity = (value) => {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}

export const ProductCardSkeleton = () => (
  <article
    className="card-radius max-w-125 mx-auto flex h-full max-h-[35.875rem] w-full animate-pulse flex-col overflow-hidden border border-app-border bg-app-surface shadow-soft"
    aria-hidden="true"
  >
    <div className="relative w-full aspect-[4/5] overflow-hidden bg-app-surface-muted md:aspect-[3/4]">
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
}) => {
  const parsedQuantity = clampQuantity(editorQuantity)
  const priceAmount = formatPriceValue(product.price)

  return (
    <article className="card-radius max-w-125 mx-auto flex h-full max-h-[35.875rem] w-full flex-col overflow-hidden border border-app-border bg-app-surface shadow-soft">
      <div className="relative flex w-full aspect-[4/5] items-center justify-center overflow-hidden bg-app-surface-muted md:aspect-[3/4]">
        {product.packQuantity > 0 && !isEditorOpen && (
          <span className="absolute top-3 right-3 z-10 rounded-full bg-app-surface/95 px-3 py-1 text-xs font-semibold text-app-text shadow-sm backdrop-blur">
            Qadoq: {product.packQuantity} ta
          </span>
        )}

        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-auto w-auto max-h-[22rem] max-w-[82%] object-contain sm:max-h-[24rem]"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-semibold text-app-text-soft">
            Rasm mavjud emas
          </div>
        )}
      </div>

      <div className="flex flex-1 justify-between flex-col p-3 md:px-4">
        <div className="">
          {!isEditorOpen && (
            <>
              <h2 className="mt-3 line-clamp-2 text-sm font-bold text-app-text md:text-base">
                {product.name}
              </h2>
            </>
          )}
        </div>

        {!isEditorOpen && (
          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="min-w-0 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">
                Narxi:
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <span className="whitespace-nowrap text-xl font-black leading-none tracking-[-0.04em] text-app-text md:text-[26px]">
                  {priceAmount} so&apos;m
                </span>
                <span className=" text-base font-bold text-app-text-soft md:text-base">

                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenEditor(product)}
              aria-label={quantityInCart > 0 ? 'Savatni yangilash' : "Savatga qo'shish"}
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-app-accent bg-app-accent text-app-accent-contrast transition hover:opacity-90"
            >
              <ShoppingCart size={22} strokeWidth={2.1} />
            </button>
          </div>
        )}

        {isEditorOpen ? (
          <div className="">
            <div className=" grid grid-cols-11 gap-2">
              {[-5, -1].map((step) => (
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
                className="col-span-3 rounded-[1.4rem] border-2 border-app-accent bg-app-surface px-4 py-4 text-center text-2xl font-extrabold text-app-text shadow-[0_0_0_3px_rgba(15,118,110,0.14)] focus:outline-none"
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

            <div className=" rounded-2xl bg-app-surface px-4 py-2 text-sm text-app-text">
              Jami: <span className="font-extrabold">{formatPrice(product.price * parsedQuantity)}</span>
            </div>

            <div className="-mt-1 flex gap-2">
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
        ) : null}

      </div>
    </article>
  )
}

export default ProductCard
