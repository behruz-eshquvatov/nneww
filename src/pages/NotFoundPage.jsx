import { Link } from 'react-router-dom'
import { appConfig } from '../lib/env'

const NotFoundPage = () => (
  <main className="flex min-h-dvh items-center justify-center bg-app-bg p-6">
    <div className="card-radius shadow-soft w-full max-w-lg border border-app-border bg-app-surface p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-app-text-soft">
        404
      </p>
      <h1 className="mt-3 text-3xl font-extrabold text-app-text">Sahifa topilmadi</h1>
      <p className="mt-3 text-sm leading-6 text-app-text-soft">
        Bu loyihada faqat bitta savdo sahifasi qoldirildi. Noma&apos;lum route ochilsa,
        shu 404 sahifa ko&apos;rinadi.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-2xl bg-app-accent px-5 py-3 text-sm font-bold text-app-accent-contrast"
      >
        {appConfig.title} ga qaytish
      </Link>
    </div>
  </main>
)

export default NotFoundPage
