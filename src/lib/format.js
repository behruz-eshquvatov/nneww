import { appConfig } from './env'

export const formatPrice = (value) => {
  const amount = Number(value) || 0
  const hasDecimals = !Number.isInteger(amount)

  return `${new Intl.NumberFormat('uz-UZ', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount)} ${appConfig.currency}`
}

export const formatCount = (value) => new Intl.NumberFormat('uz-UZ').format(value)
