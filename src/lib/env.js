const readEnv = (key, fallback = '') => {
  const value = import.meta.env[key]
  return typeof value === 'string' ? value.trim() : fallback
}

export const appConfig = {
  title: readEnv('VITE_APP_TITLE', 'New Tujjors'),
  subtitle: readEnv('VITE_APP_SUBTITLE', ''),
  currency: readEnv('VITE_APP_CURRENCY', "so'm"),
}

const normalizeBaseUrl = (value) => value.replace(/\/+$/g, '')

export const apiConfig = {
  baseUrl: normalizeBaseUrl(readEnv('VITE_API_BASE_URL')),
}
