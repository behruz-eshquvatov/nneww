const readEnv = (key, fallback = '') => {
  const value = import.meta.env[key]
  return typeof value === 'string' ? value.trim() : fallback
}

const createEntity = (prefix) => ({
  CS_id: readEnv(`${prefix}_CS_ID`),
  SD_id: readEnv(`${prefix}_SD_ID`),
  code_1C: readEnv(`${prefix}_CODE_1C`),
})

export const isEntityConfigured = (entity) =>
  Boolean(entity.CS_id || entity.SD_id || entity.code_1C)

export const appConfig = {
  title: readEnv('VITE_APP_TITLE', 'New Tujjors'),
  subtitle: readEnv('VITE_APP_SUBTITLE', ''),
  currency: readEnv('VITE_APP_CURRENCY', "so'm"),
}

export const salesDoctorConfig = {
  apiUrl: readEnv('VITE_SD_API_URL'),
  readHttpMethod: readEnv('VITE_SD_READ_HTTP_METHOD', 'POST').toUpperCase(),
  filialId: readEnv('VITE_SD_FILIAL_ID', '0'),
  directAuth: {
    userId: readEnv('VITE_SD_USER_ID'),
    token: readEnv('VITE_SD_TOKEN'),
  },
  loginAuth: {
    login: readEnv('VITE_SD_LOGIN'),
    password: readEnv('VITE_SD_PASSWORD'),
  },
  trade: createEntity('VITE_SD_TRADE'),
  priceType: createEntity('VITE_SD_PRICE_TYPE'),
  order: {
    client: createEntity('VITE_SD_ORDER_CLIENT'),
    agent: createEntity('VITE_SD_ORDER_AGENT'),
    warehouse: createEntity('VITE_SD_ORDER_WAREHOUSE'),
  },
}

export const hasDirectAuth = Boolean(
  salesDoctorConfig.directAuth.userId && salesDoctorConfig.directAuth.token,
)

export const hasLoginAuth = Boolean(
  salesDoctorConfig.loginAuth.login && salesDoctorConfig.loginAuth.password,
)

export const getMissingOrderConfig = () => {
  const missing = []

  if (!salesDoctorConfig.apiUrl) {
    missing.push('VITE_SD_API_URL')
  }

  if (!hasDirectAuth && !hasLoginAuth) {
    missing.push('VITE_SD_USER_ID + VITE_SD_TOKEN or VITE_SD_LOGIN + VITE_SD_PASSWORD')
  }

  if (!isEntityConfigured(salesDoctorConfig.priceType)) {
    missing.push('VITE_SD_PRICE_TYPE_*')
  }

  if (!isEntityConfigured(salesDoctorConfig.order.client)) {
    missing.push('VITE_SD_ORDER_CLIENT_*')
  }

  if (!isEntityConfigured(salesDoctorConfig.order.agent)) {
    missing.push('VITE_SD_ORDER_AGENT_*')
  }

  if (!isEntityConfigured(salesDoctorConfig.order.warehouse)) {
    missing.push('VITE_SD_ORDER_WAREHOUSE_*')
  }

  if (!salesDoctorConfig.filialId) {
    missing.push('VITE_SD_FILIAL_ID')
  }

  return missing
}
