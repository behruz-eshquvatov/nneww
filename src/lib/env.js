const readEnv = (key, fallback = '') => {
  const value = import.meta.env[key]
  return typeof value === 'string' ? value.trim() : fallback
}

const apiBaseUrl = readEnv('VITE_API_BASE_URL', '')
const salesDocAssetBaseUrl = readEnv('VITE_SALESDOC_ASSET_BASE_URL', '')

export const appConfig = {
  title: readEnv('VITE_APP_TITLE', 'New Tujjors'),
  subtitle: readEnv('VITE_APP_SUBTITLE', ''),
  currency: readEnv('VITE_APP_CURRENCY', "so'm"),
}

export const healthEndpoint = `${apiBaseUrl}/health`
export const salesDocLoginEndpoint = `${apiBaseUrl}/api/salesdoc/login`
export const salesDocProductsEndpoint = `${apiBaseUrl}/api/salesdoc/products`
export const salesDocAssetBaseEndpoint = salesDocAssetBaseUrl
