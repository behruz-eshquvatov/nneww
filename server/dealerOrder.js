import { getDealerApiBaseUrl } from "./dealerApi.js";

const compactText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeWhitespace = (value) =>
  compactText(value).replace(/\s+/g, " ");

const normalizeCustomerName = (value) => normalizeWhitespace(value);

const normalizeCustomerPhone = (value) => {
  const raw = compactText(value);
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 9) {
    return `+998${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("998")) {
    return `+${digits}`;
  }

  if (raw.startsWith("+") && digits) {
    return `+${digits}`;
  }

  return raw;
};

const countLetters = (value) => value.replace(/[^\p{L}]/gu, "").length;

const getDealerOrderEndpoint = () =>
  compactText(process.env.DEALER_ORDER_ENDPOINT) ||
  `${getDealerApiBaseUrl().replace(/\/$/, "")}/api/dealers/send-order/`;

const normalizeCartItem = (item) => {
  const quantity = Number(item?.quantity) || 0;
  const price = Number(item?.price) || 0;

  return {
    name: compactText(item?.name),
    price,
    quantity,
  };
};

const normalizeCustomer = (customer) => ({
  name:
    normalizeCustomerName(customer?.name) ||
    normalizeCustomerName(customer?.customer_name) ||
    normalizeCustomerName(customer?.customerName),
  phone:
    normalizeCustomerPhone(customer?.phone) ||
    normalizeCustomerPhone(customer?.customer_phone) ||
    normalizeCustomerPhone(customer?.customerPhone),
});

const validateDealerOrderPayload = (payload) => {
  if (!payload.name) {
    const error = new Error("Customer name is required.");
    error.statusCode = 400;
    throw error;
  }

  if (countLetters(payload.name) < 2 || /\d/.test(payload.name)) {
    const error = new Error("Customer name must contain at least 2 letters and no numbers.");
    error.statusCode = 400;
    throw error;
  }

  if (!payload.phone) {
    const error = new Error("Customer phone is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!/^\+998\d{9}$/.test(payload.phone)) {
    const error = new Error("Customer phone must use the +998901234567 format.");
    error.statusCode = 400;
    throw error;
  }
};

export const buildDealerOrderPayload = (payload) => {
  const customer = normalizeCustomer(payload?.customer || payload);
  const link =
    compactText(payload?.link) ||
    compactText(payload?.pageUrl) ||
    compactText(payload?.page_url);
  const cartItems = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.cart)
      ? payload.cart.map(normalizeCartItem)
      : [];

  return {
    name: customer.name,
    phone: customer.phone,
    link,
    items: cartItems,
  };
};

const readResponseBody = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const readErrorMessage = (payload, fallbackMessage) => {
  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  if (typeof payload?.detail === "string" && payload.detail.trim()) {
    return payload.detail.trim();
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  if (typeof payload?.raw === "string" && payload.raw.trim()) {
    return payload.raw.trim();
  }

  return fallbackMessage;
};

export const sendDealerOrder = async (payload) => {
  const dealerPayload = buildDealerOrderPayload(payload);
  validateDealerOrderPayload(dealerPayload);
  const dealerOrderEndpoint = getDealerOrderEndpoint();
  const response = await fetch(dealerOrderEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dealerPayload),
  });
  const data = await readResponseBody(response);

  if (!response.ok) {
    const error = new Error(
      readErrorMessage(
        data,
        `Dealer order API rejected the request with status ${response.status}.`,
      ),
    );

    error.statusCode = response.status;
    error.responsePayload = data;
    throw error;
  }

  return {
    status: true,
    result: data,
    forwardedTo: dealerOrderEndpoint,
    payload: dealerPayload,
  };
};
