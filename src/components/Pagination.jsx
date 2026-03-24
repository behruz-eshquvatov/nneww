const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-3">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-xl border border-app-border px-3 py-2 text-sm font-semibold text-app-text transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        Oldingi
      </button>

      <p className="text-sm font-semibold text-app-text-soft">
        Sahifa {currentPage} / {totalPages}
      </p>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-xl border border-app-border px-3 py-2 text-sm font-semibold text-app-text transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        Keyingi
      </button>
    </div>
  )
}

export default Pagination
