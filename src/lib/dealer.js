const normalizeDealerId = (value) =>
  typeof value === 'string' ? decodeURIComponent(value).trim() : ''

export const extractDealerIdFromPathname = (pathname = '') => {
  const [firstSegment = ''] = pathname.split('/').filter(Boolean)

  return normalizeDealerId(firstSegment)
}

export const isValidDealerId = (dealerId) => dealerId.length > 0

export const resolveDealerId = (routeDealerId) => {
  const fromRoute = normalizeDealerId(routeDealerId)

  if (fromRoute) {
    return fromRoute
  }

  if (typeof window === 'undefined') {
    return ''
  }

  return extractDealerIdFromPathname(window.location.pathname)
}
