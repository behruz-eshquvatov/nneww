const salesDocBaseUrl =
  process.env.SALESDOC_BASE_URL || "https://villobuhara.salesdoc.io/api/v2/";

const authTtlMs = Number(process.env.SALESDOC_AUTH_TTL_MS || 4 * 60 * 1000);
const defaultPriceTypeId =
  String(process.env.SALESDOC_PRICE_TYPE_ID || "d0_2").trim() || "d0_2";

const defaultFilial = {
  filial_id: Number(process.env.SALESDOC_FILIAL_ID || 0),
};

let authCache = {
  token: null,
  expiresAt: 0,
  pending: null,
};

const getSalesDocCredentials = () => {
  const login = process.env.SALESDOC_LOGIN;
  const password = process.env.SALESDOC_PASSWORD;

  if (!login || !password) {
    throw new Error(
      "Set SALESDOC_LOGIN and SALESDOC_PASSWORD in your environment before starting the server.",
    );
  }

  return { login, password };
};

const requestSalesDoc = async (payload) => {
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

const loginToSalesDoc = async () => {
  console.log("Logging in to SalesDoc...");

  const { login, password } = getSalesDocCredentials();

  const { response, data } = await requestSalesDoc({
    method: "login",
    auth: { login, password },
  });

  if (
    !response.ok ||
    !data?.status ||
    !data?.result?.userId ||
    !data?.result?.token
  ) {
    throw new Error(data?.error || data?.details || "SalesDoc login failed.");
  }

  return data.result;
};

const clearSalesDocAuth = () => {
  authCache = {
    token: null,
    expiresAt: 0,
    pending: null,
  };
};

export const getSalesDocAuth = async ({ forceRefresh = false } = {}) => {
  const now = Date.now();

  if (!forceRefresh && authCache.token && authCache.expiresAt > now) {
    return authCache.token;
  }

  if (authCache.pending) {
    return authCache.pending;
  }

  const loginPromise = loginToSalesDoc()
    .then((token) => {
      authCache = {
        token,
        expiresAt: Date.now() + authTtlMs,
        pending: null,
      };

      return token;
    })
    .catch((error) => {
      clearSalesDocAuth();
      throw error;
    });

  authCache.pending = loginPromise;
  return loginPromise;
};

const isInvalidTokenResponse = (payload) =>
  payload?.status === false &&
  Number(payload?.error?.code) === 401 &&
  String(payload?.error?.message || "")
    .toLowerCase()
    .includes("invalid token");

const requestSalesDocWithAuth = async (payload, { allowRetry = true } = {}) => {
  const auth = await getSalesDocAuth();

  const result = await requestSalesDoc({
    ...payload,
    auth,
  });

  if (allowRetry && isInvalidTokenResponse(result.data)) {
    console.log("SalesDoc token expired or invalid, refreshing auth...");
    clearSalesDocAuth();

    const freshAuth = await getSalesDocAuth({ forceRefresh: true });

    return requestSalesDoc({
      ...payload,
      auth: freshAuth,
    });
  }

  return result;
};

const buildSalesDocPayload = (method, params) => ({
  filial: defaultFilial,
  method,
  params,
});

const compactText = (value) =>
  typeof value === "string" ? value.trim() : "";

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

const buildPriceMap = (prices) =>
  prices.reduce((map, item) => {
    const key = resolveSalesDocEntityId(item?.product);
    const price = Number(item?.price);

    if (key && Number.isFinite(price)) {
      map.set(key, price);
    }

    return map;
  }, new Map());

export const fetchSalesDocCatalog = async () => {
  const [categoriesResult, subCategoriesResult, productsResult, pricesResult] =
    await Promise.all([
      requestSalesDocWithAuth(
        buildSalesDocPayload("getProductCategory", {
          page: 1,
          limit: 100,
        }),
      ),
      requestSalesDocWithAuth(
        buildSalesDocPayload("getProductSubCategory", {
          page: 1,
          limit: 100,
        }),
      ),
      requestSalesDocWithAuth(
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
        buildSalesDocPayload("getPrice", {
          priceType: buildSalesDocEntityRef(defaultPriceTypeId),
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
      price: Number.isFinite(resolvedPrice) ? resolvedPrice : 0,
      priceValue: Number.isFinite(resolvedPrice) ? resolvedPrice : 0,
      price_type: defaultPriceTypeId,
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
