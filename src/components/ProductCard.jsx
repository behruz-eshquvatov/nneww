import { Barcode, ShoppingCart } from 'lucide-react'
import { formatPrice } from '../lib/format'

const ProductCard = ({ product, quantityInCart, onOpenQuantity }) => (
  <article className="card-radius max-w-125 mx-auto w-full shadow-soft flex h-full flex-col overflow-hidden border border-app-border bg-app-surface">
    <div className="h-64 overflow-hidden bg-app-surface-muted sm:h-56 md:h-64">
      <img
        src={product.image}
        alt={product.name}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>

    <div className="flex flex-1 flex-col p-3 md:p-4">
      <div className="min-h-0 flex-1">
        <h2 className="line-clamp-2 text-sm font-bold text-app-text md:text-base">
          {product.name}
        </h2>

        <div className="mt-3 flex items-center gap-2 text-xs text-app-text-soft">
          <Barcode size={14} strokeWidth={2} />
          <span className="truncate">{product.barcode || product.code}</span>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-app-text-soft">Narx</p>
          <p className="text-sm font-extrabold text-app-text md:text-lg">
            {formatPrice(product.price)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenQuantity(product)}
          className="inline-flex items-center gap-2 rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90"
        >
          <ShoppingCart size={16} strokeWidth={2.2} />
          <span>{quantityInCart > 0 ? `Savatda ${quantityInCart}` : 'Sotib olish'}</span>
        </button>
      </div>
    </div>
  </article>
)

export default ProductCard
