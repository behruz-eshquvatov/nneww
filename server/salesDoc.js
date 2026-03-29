const defaultPriceTypeId = "d0_2";

const authCacheByKey = new Map();

const compactText = (value) =>
  typeof value === "string" ? value.trim() : "";

const getAuthTtlMs = () =>
  Number(process.env.SALESDOC_AUTH_TTL_MS || 4 * 60 * 1000);

const getDefaultFilial = () => ({
  filial_id: Number(process.env.SALESDOC_FILIAL_ID || 0),
});

const normalizeSalesDocBaseUrl = (value) => {
  const baseUrl = compactText(value);

  if (!baseUrl) {
    throw new Error("SalesDoc base URL is required.");
  }

  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

const getSalesDocCredentials = (config) => {
  const login = compactText(config?.login);
  const password = compactText(config?.password);
  const salesDocBaseUrl = normalizeSalesDocBaseUrl(config?.salesDocBaseUrl);

  if (!login || !password) {
    throw new Error("SalesDoc login and password are required.");
  }

  return { login, password, salesDocBaseUrl };
};

const buildAuthCacheKey = (config) => {
  const { login, password, salesDocBaseUrl } = getSalesDocCredentials(config);

  return [salesDocBaseUrl, login, password].join("|");
};

const getAuthCacheEntry = (cacheKey) =>
  authCacheByKey.get(cacheKey) || {
    token: null,
    expiresAt: 0,
    pending: null,
  };

const setAuthCacheEntry = (cacheKey, entry) => {
  authCacheByKey.set(cacheKey, entry);
};

const requestSalesDoc = async (config, payload) => {
  const { salesDocBaseUrl } = getSalesDocCredentials(config);
  const response = await fetch(salesDocBaseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? JSON.parse(text)
    : { raw: text };

  return { response, data };
};

const loginToSalesDoc = async (config) => {
  const { login, password } = getSalesDocCredentials(config);

  const { response, data } = await requestSalesDoc(config, {
    method: "login",
    auth: { login, password },
  });

  if (
    !response.ok ||
    !data?.status ||
    !data?.result?.userId ||
    !data?.result?.token
  ) {
    throw new Error(readSalesDocErrorMessage(data, "SalesDoc login failed."));
  }

  return data.result;
};

const clearSalesDocAuth = (config) => {
  authCacheByKey.delete(buildAuthCacheKey(config));
};

export const getSalesDocAuth = async (
  config,
  { forceRefresh = false } = {},
) => {
  const now = Date.now();
  const cacheKey = buildAuthCacheKey(config);
  const cachedEntry = getAuthCacheEntry(cacheKey);

  if (!forceRefresh && cachedEntry.token && cachedEntry.expiresAt > now) {
    return cachedEntry.token;
  }

  if (cachedEntry.pending) {
    return cachedEntry.pending;
  }

  const loginPromise = loginToSalesDoc(config)
    .then((token) => {
      setAuthCacheEntry(cacheKey, {
        token,
        expiresAt: Date.now() + getAuthTtlMs(),
        pending: null,
      });

      return token;
    })
    .catch((error) => {
      clearSalesDocAuth(config);
      throw error;
    });

  setAuthCacheEntry(cacheKey, {
    ...cachedEntry,
    pending: loginPromise,
  });

  return loginPromise;
};

const isInvalidTokenResponse = (payload) =>
  payload?.status === false &&
  Number(payload?.error?.code) === 401 &&
  String(payload?.error?.message || "")
    .toLowerCase()
    .includes("invalid token");

const requestSalesDocWithAuth = async (
  config,
  payload,
  { allowRetry = true } = {},
) => {
  const auth = await getSalesDocAuth(config);

  const result = await requestSalesDoc(config, {
    ...payload,
    auth,
  });

  if (allowRetry && isInvalidTokenResponse(result.data)) {
    clearSalesDocAuth(config);

    const freshAuth = await getSalesDocAuth(config, { forceRefresh: true });

    return requestSalesDoc(config, {
      ...payload,
      auth: freshAuth,
    });
  }

  return result;
};

const buildSalesDocPayload = (method, params) => ({
  filial: getDefaultFilial(),
  method,
  params,
});

const buildSalesDocEntityRef = (value) => {
  const id = compactText(String(value || ""));

  return {
    CS_id: id,
    SD_id: id,
    code_1C: "",
  };
};

const readSalesDocErrorMessage = (payload, fallbackMessage) => {
  const rawError = payload?.error;

  if (typeof rawError === "string" && rawError.trim()) {
    return rawError.trim();
  }

  if (
    rawError &&
    typeof rawError?.message === "string" &&
    rawError.message.trim()
  ) {
    return rawError.message.trim();
  }

  if (typeof payload?.details === "string" && payload.details.trim()) {
    return payload.details.trim();
  }

  return fallbackMessage;
};

const unwrapSalesDocCollection = (result, key, fallbackMessage) => {
  if (!result?.response?.ok || result?.data?.status === false) {
    throw new Error(readSalesDocErrorMessage(result?.data, fallbackMessage));
  }

  return Array.isArray(result?.data?.result?.[key])
    ? result.data.result[key]
    : [];
};

const unwrapSalesDocArrayResult = (result, fallbackMessage) => {
  if (!result?.response?.ok || result?.data?.status === false) {
    throw new Error(readSalesDocErrorMessage(result?.data, fallbackMessage));
  }

  return Array.isArray(result?.data?.result) ? result.data.result : [];
};

const resolveSalesDocEntityId = (value) => {
  if (typeof value === "string" || typeof value === "number") {
    return compactText(String(value));
  }

  return compactText(value?.CS_id || value?.SD_id || value?.code_1C || value?.id);
};

const resolveAbsoluteAssetUrl = (baseUrl, assetPath) => {
  const normalizedPath = compactText(assetPath);

  if (!normalizedPath) {
    return normalizedPath;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  try {
    return new URL(normalizedPath, baseUrl).toString();
  } catch {
    return normalizedPath;
  }
};

const buildPriceMap = (prices) =>
  prices.reduce((map, item) => {
    const key = resolveSalesDocEntityId(item?.product);
    const price = Number(item?.price);

    if (key && Number.isFinite(price)) {
      map.set(key, price);
    }

    return map;
  }, new Map());

export const fetchSalesDocCatalog = async (config) => {
  const { salesDocBaseUrl } = getSalesDocCredentials(config);
  const priceTypeId = compactText(config?.priceTypeId) || defaultPriceTypeId;
  const [categoriesResult, subCategoriesResult, productsResult, pricesResult] =
    await Promise.all([
      requestSalesDocWithAuth(
        config,
        buildSalesDocPayload("getProductCategory", {
          page: 1,
          limit: 100,
        }),
      ),
      requestSalesDocWithAuth(
        config,
        buildSalesDocPayload("getProductSubCategory", {
          page: 1,
          limit: 100,
        }),
      ),
      requestSalesDocWithAuth(
        config,
        buildSalesDocPayload("getProduct", {
          page: 1,
          limit: 100,
          filter: {
            trade: {
              CS_id: 1,
              SD_id: 1,
              code_1C: "",
            },
          },
        }),
      ),
      requestSalesDocWithAuth(
        config,
        buildSalesDocPayload("getPrice", {
          priceType: buildSalesDocEntityRef(priceTypeId),
        }),
      ),
    ]);

  const products = unwrapSalesDocCollection(
    productsResult,
    "product",
    "Failed to fetch SalesDoc products.",
  );
  const prices = unwrapSalesDocArrayResult(
    pricesResult,
    "Failed to fetch SalesDoc product prices.",
  );
  const priceByProductId = buildPriceMap(prices);
  const productsWithPrices = products.map((product) => {
    const productId = resolveSalesDocEntityId(product);
    const resolvedPrice = priceByProductId.get(productId);

    return {
      ...product,
      imageUrl: resolveAbsoluteAssetUrl(salesDocBaseUrl, product?.imageUrl),
      thumbUrl: resolveAbsoluteAssetUrl(salesDocBaseUrl, product?.thumbUrl),
      price: Number.isFinite(resolvedPrice) ? resolvedPrice : 0,
      priceValue: Number.isFinite(resolvedPrice) ? resolvedPrice : 0,
      price_type: priceTypeId,
    };
  });

  return {
    status: true,
    result: {
      productCategory: unwrapSalesDocCollection(
        categoriesResult,
        "productCategory",
        "Failed to fetch SalesDoc product categories.",
      ),
      productSubCategory: unwrapSalesDocCollection(
        subCategoriesResult,
        "productSubCategory",
        "Failed to fetch SalesDoc product subcategories.",
      ),
      product: productsWithPrices,
    },
  };
};
