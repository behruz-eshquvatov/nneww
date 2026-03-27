import dotenv from "dotenv";

import { fetchSalesDocCatalog } from "../../server/salesDoc.js";

dotenv.config({ quiet: true });

const jsonHeaders = {
  "Content-Type": "application/json",
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: false,
        error: "Method Not Allowed",
      }),
    };
  }

  try {
    const data = await fetchSalesDocCatalog();

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: false,
        error: "Failed to fetch SalesDoc catalog",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
