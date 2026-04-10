const CURRENCY = "so'm"

export const formatPriceValue = (value) => {
  const amount = Number(value) || 0
  const hasDecimals = !Number.isInteger(amount)
  const sign = amount < 0 ? '-' : ''
  const absoluteAmount = Math.abs(amount)
  const fixedAmount = absoluteAmount.toFixed(hasDecimals ? 2 : 0)
  const [integerPart, decimalPart] = fixedAmount.split('.')
  const groupedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const formattedAmount = decimalPart
    ? `${groupedIntegerPart}.${decimalPart}`
    : groupedIntegerPart

  return `${sign}${formattedAmount}`
}

export const formatPrice = (value) => `${formatPriceValue(value)} ${CURRENCY}`

export const formatCount = (value) => new Intl.NumberFormat('uz-UZ').format(value)
