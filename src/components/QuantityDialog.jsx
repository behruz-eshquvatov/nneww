import { Calculator, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '../lib/format'

const clampQuantity = (value) => {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}

const QuantityDialog = ({ isOpen, product, initialQuantity, onClose, onConfirm }) => {
  const inputRef = useRef(null)
  const [quantity, setQuantity] = useState(String(initialQuantity || 1))

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 40)

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen || !product) {
    return null
  }

  const parsedQuantity = clampQuantity(quantity)

  const changeQuantity = (step) => {
    setQuantity(String(Math.max(1, parsedQuantity + step)))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onConfirm(product, parsedQuantity)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="card-radius shadow-soft w-full max-w-md border border-app-border bg-app-surface p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-app-text-soft">
              <Calculator size={14} />
              Miqdor tanlash
            </p>
            <h2 className="mt-2 text-lg font-extrabold text-app-text">{product.name}</h2>
            <p className="mt-2 text-sm text-app-text-soft">{formatPrice(product.price)}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-app-border p-2 text-app-text-soft"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-app-text-soft">Soni</span>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              min="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4 text-2xl font-extrabold text-app-text"
            />
          </label>

          <div className="grid grid-cols-6 gap-2">
            {[-10, -5, -1, 1, 5, 10].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => changeQuantity(step)}
                className="rounded-2xl border border-app-border bg-app-surface-muted px-3 py-3 text-sm font-semibold text-app-text"
              >
                {step > 0 ? `+${step}` : step}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-app-accent-soft px-4 py-3 text-sm text-app-text">
            Jami: <span className="font-extrabold">{formatPrice(product.price * parsedQuantity)}</span>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-app-accent px-4 py-4 text-base font-bold text-app-accent-contrast transition hover:opacity-90"
          >
            Savatga qo&apos;shish
          </button>
        </form>
      </div>
    </div>
  )
}

export default QuantityDialog
