import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import fetch from "node-fetch";
import { z } from "zod";
import express from "express";

// URLs untuk ketiga Google Sheets Apps Script endpoints
const STOCK_URL = "https://script.google.com/macros/s/AKfycbxwJ7ht-S4EzizZxkXUjkrl5PnL3nxuC4nLN-hmDMDUWSHpgdX11ucSRDy-9AiY6eI1jA/exec";
const RESERVATION_URL = "https://script.google.com/macros/s/AKfycbxPa5Bu_B-q-A925YhFF-JFW9iRDEuGI7hfKq5jSMlUHmBM46ZmsCmekG7uRQ19Zoa9/exec";
const PRICE_CATALOG_URL = "https://script.google.com/macros/s/AKfycbzStu9JYQmMWJTdASLaMnBq7BkNtMfIytK5KW4e5IzUD__MBEWsq_Vq-Vlyhdw8t4Mh/exec";

const server = new McpServer({
  name: "navi-stock-server",
  version: "1.0.0",
});

// Tool 1: get_stock
server.tool(
  "get_stock",
  "Get costume stock availability with all details including size, ETA, tier, and includes",
  {
    costume: z.string().describe("Nama kostum, contoh: Hu Tao"),
    size: z.string().optional().describe("Ukuran: S/M/L/XL (optional)"),
  },
  async ({ costume, size }) => {
    try {
      const res = await fetch(STOCK_URL);
      const rows = await res.json();

      const lower = costume.toLowerCase();

      const match = rows.find((row) => {
        const name = (row.Costume || "").toLowerCase();
        return name.includes(lower);
      });

      if (!match) {
        return {
          content: [
            {
              type: "text",
              text: `Costume "${costume}" tidak ditemukan di stock`,
            },
          ],
        };
      }

      let sizeInfo = {};
      if (size) {
        const upperSize = size.toUpperCase();
        const availableSizes = (match.SizeAvailable || "").toUpperCase();

        if (!availableSizes.includes(upperSize)) {
          return {
            content: [
              {
                type: "text",
                text: `Costume "${match.Costume}" tersedia, tapi size ${upperSize} tidak ada. Size available: ${match.SizeAvailable}`,
              },
            ],
          };
        }

        let etaField = `ETA ${upperSize}`;
        const eta = (match[etaField] || "").toString().trim();

        sizeInfo = {
          size: upperSize,
          eta: eta,
          status: eta && eta !== "-" ? `Disewa sampai ${eta}` : "Available sekarang",
        };
      }

      const result = {
        found: true,
        costume: match.Costume || "",
        imageURL: match.ImageURL || "",
        tagline: match.Tagline || match["Tagline/CosplayLevel"] || "",
        tier: match.Tier || "",
        rys: match.RYS || "",
        sizeAvailable: match.SizeAvailable || "",
        etaS: match["ETA S"] || "",
        etaM: match["ETA M"] || "",
        etaL: match["ETA L"] || "",
        etaXL: match["ETA XL"] || "",
        includes: match.Includes || "",
        ...sizeInfo,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 2: get_reservation
server.tool(
  "get_reservation",
  "Get reservation/booking information for a costume on specific date",
  {
    cosplay: z.string().describe("Nama cosplay/costume yang direservasi"),
    size: z.string().optional().describe("Ukuran: S/M/L/XL (optional)"),
    tanggal: z.string().optional().describe("Tanggal dalam format YYYY-MM-DD (optional)"),
  },
  async ({ cosplay, size, tanggal }) => {
    try {
      const res = await fetch(RESERVATION_URL);
      const rows = await res.json();

      const lower = cosplay.toLowerCase();

      let matches = rows.filter((row) => {
        const name = (row.Cosplay || "").toLowerCase();
        return name.includes(lower);
      });

      if (size) {
        const upperSize = size.toUpperCase();
        matches = matches.filter((row) => {
          const rowSize = (row.Size || "").toUpperCase();
          return rowSize === upperSize;
        });
      }

      if (tanggal) {
        matches = matches.filter((row) => {
          const rowTanggal = (row.Tanggal || "").toString();
          return rowTanggal.includes(tanggal);
        });
      }

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Tidak ada reservasi ditemukan untuk "${cosplay}"${size ? ` size ${size}` : ""}${tanggal ? ` pada tanggal ${tanggal}` : ""}`,
            },
          ],
        };
      }

      const result = {
        found: true,
        count: matches.length,
        reservations: matches.map((row) => ({
          nama: row.Nama || "",
          cosplay: row.Cosplay || "",
          size: row.Size || "",
          tier: row.Tier || "",
          rys: row.RYS || "",
          additional: row.Additional || "",
          price: row.Price || "",
          tanggal: row.Tanggal || "",
        })),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 3: get_price
server.tool(
  "get_price",
  "Get price catalog information including rental price, brand, series, and purchase price",
  {
    cosplay: z.string().describe("Nama cosplay/costume"),
    tier: z.string().optional().describe("Tier level (optional): Tier 1, Tier 2, Tier 3"),
  },
  async ({ cosplay, tier }) => {
    try {
      const res = await fetch(PRICE_CATALOG_URL);
      const rows = await res.json();

      const lower = cosplay.toLowerCase();

      let match = rows.find((row) => {
        const name = (row.Cosplay || "").toLowerCase();
        const matchName = name.includes(lower);

        if (tier) {
          const rowTier = (row.Tier || "").toLowerCase();
          const targetTier = tier.toLowerCase();
          return matchName && rowTier.includes(targetTier);
        }

        return matchName;
      });

      if (!match) {
        return {
          content: [
            {
              type: "text",
              text: `Costume "${cosplay}"${tier ? ` tier ${tier}` : ""} tidak ditemukan di price catalog`,
            },
          ],
        };
      }

      const result = {
        found: true,
        cosplay: match.Cosplay || "",
        series: match.Series || "",
        brand: match.Brand || "",
        tier: match.Tier || "",
        rys: match.RYS || "",
        ppr: match.PPR || "",
        purchase: match.Purchase || "",
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Express app untuk SSE
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "Navi MCP Server",
    version: "1.0.0",
    transport: "SSE",
    endpoint: "/sse",
    tools: ["get_stock", "get_reservation", "get_price"],
  });
});

// SSE endpoint
app.get("/sse", async (req, res) => {
  console.log("📡 New SSE connection");
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    const transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
    console.log("✅ MCP server connected via SSE");
  } catch (error) {
    console.error("❌ SSE connection error:", error);
    res.end();
  }
});

// Messages endpoint for POST requests
app.post("/messages", express.json(), async (req, res) => {
  console.log("📨 Received message:", req.body);
  res.json({ status: "ok" });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Navi MCP Server running on port ${PORT}`);
  console.log(`📊 Tools available: get_stock, get_reservation, get_price`);
  console.log(`🔗 Connected to Google Sheets via Apps Script`);
  console.log(`🌐 SSE endpoint: http://0.0.0.0:${PORT}/sse`);
  console.log(`🌐 Public URL: https://navi-mcp-production.up.railway.app/sse`);
});
