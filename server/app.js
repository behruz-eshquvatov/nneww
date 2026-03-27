import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { fetchSalesDocCatalog, getSalesDocAuth } from "./salesDoc.js";

dotenv.config({ quiet: true });

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/salesdoc/login", async (_request, response) => {
  try {
    const loginData = await getSalesDocAuth();

    response.json({
      status: true,
      result: loginData,
    });
  } catch (error) {
    response.status(500).json({
      status: false,
      error: "Failed to log in to SalesDoc",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/salesdoc/products", async (_request, response) => {
  try {
    const data = await fetchSalesDocCatalog();
    console.log(data);

    response.json(data);
  } catch (error) {
    response.status(500).json({
      status: false,
      error: "Failed to fetch SalesDoc catalog",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default app;
