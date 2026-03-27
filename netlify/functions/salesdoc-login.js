import dotenv from "dotenv";

import { getSalesDocAuth } from "../../server/salesDoc.js";

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
    const loginData = await getSalesDocAuth();

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: true,
        result: loginData,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: false,
        error: "Failed to log in to SalesDoc",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
