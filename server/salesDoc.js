const salesDocBaseUrl =
  process.env.SALESDOC_BASE_URL || "https://villobuhara.salesdoc.io/api/v2/";

const authTtlMs = Number(process.env.SALESDOC_AUTH_TTL_MS || 4 * 60 * 1000);

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

export const fetchSalesDocCatalog = async () => {
  const categoriesResult = await requestSalesDocWithAuth(
    buildSalesDocPayload("getProductCategory", {
      page: 1,
      limit: 100,
    }),
  );

  const subCategoriesResult = await requestSalesDocWithAuth(
    buildSalesDocPayload("getProductSubCategory", {
      page: 1,
      limit: 100,
    }),
  );

  const productsResult = await requestSalesDocWithAuth(
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
  );

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
      product: unwrapSalesDocCollection(
        productsResult,
        "product",
        "Failed to fetch SalesDoc products.",
      ),
    },
  };
};
