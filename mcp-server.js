import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// URLs untuk Google Sheets
const STOCK_URL = "https://script.google.com/macros/s/AKfycbxwJ7ht-S4EzizZxkXUjkrl5PnL3nxuC4nLN-hmDMDUWSHpgdX11ucSRDy-9AiY6eI1jA/exec";
const RESERVATION_URL = "https://script.google.com/macros/s/AKfycbxPa5Bu_B-q-A925YhFF-JFW9iRDEuGI7hfKq5jSMlUHmBM46ZmsCmekG7uRQ19Zoa9/exec";
const PRICE_CATALOG_URL = "https://script.google.com/macros/s/AKfycbzStu9JYQmMWJTdASLaMnBq7BkNtMfIytK5KW4e5IzUD__MBEWsq_Vq-Vlyhdw8t4Mh/exec";

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Tools implementation
async function getStock(params) {
  const { costume, size } = params;
  const response = await fetch(STOCK_URL);
  const rows = await response.json();

  const lower = costume.toLowerCase();
  const match = rows.find((row) => {
    const name = (row.Costume || "").toLowerCase();
    return name.includes(lower);
  });

  if (!match) {
    return {
      content: [{
        type: "text",
        text: `Costume "${costume}" tidak ditemukan di stock`
      }]
    };
  }

  let result = `**${match.Costume}**\n\n`;
  result += `📸 ${match.ImageURL}\n\n`;
  result += `🏷️ ${match.Tagline || match["Tagline/CosplayLevel"]}\n`;
  result += `💰 Tier: ${match.Tier}\n`;
  result += `📏 Size Available: ${match.SizeAvailable}\n\n`;

  if (size) {
    const upperSize = size.toUpperCase();
    const availableSizes = (match.SizeAvailable || "").toUpperCase();

    if (!availableSizes.includes(upperSize)) {
      return {
        content: [{
          type: "text",
          text: `Costume "${match.Costume}" tersedia, tapi size ${upperSize} tidak ada.\n\nSize available: ${match.SizeAvailable}`
        }]
      };
    }

    let etaField = `ETA ${upperSize}`;
    const eta = (match[etaField] || "").toString().trim();
    
    result += `**Size ${upperSize}:**\n`;
    result += eta && eta !== "-" ? `⏰ Disewa sampai: ${eta}` : `✅ Available sekarang`;
  } else {
    result += `**ETA per Size:**\n`;
    result += `- S: ${match["ETA S"] || "Available"}\n`;
    result += `- M: ${match["ETA M"] || "Available"}\n`;
    result += `- L: ${match["ETA L"] || "Available"}\n`;
    result += `- XL: ${match["ETA XL"] || "Available"}`;
  }

  result += `\n\n📦 Includes: ${match.Includes}`;

  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}

async function getReservation(params) {
  const { cosplay, size, tanggal } = params;
  const response = await fetch(RESERVATION_URL);
  const rows = await response.json();

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
      content: [{
        type: "text",
        text: `Tidak ada reservasi untuk "${cosplay}"${size ? ` size ${size}` : ""}${tanggal ? ` pada ${tanggal}` : ""}`
      }]
    };
  }

  let result = `**Reservasi ditemukan (${matches.length})**\n\n`;
  matches.forEach((row, idx) => {
    result += `${idx + 1}. **${row.Cosplay}** (${row.Size})\n`;
    result += `   👤 ${row.Nama}\n`;
    result += `   📅 ${row.Tanggal}\n`;
    result += `   💰 ${row.Price}\n`;
    result += `   📦 Additional: ${row.Additional || "-"}\n\n`;
  });

  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}

async function getPrice(params) {
  const { cosplay, tier } = params;
  const response = await fetch(PRICE_CATALOG_URL);
  const rows = await response.json();

  const lower = cosplay.toLowerCase();
  const match = rows.find((row) => {
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
      content: [{
        type: "text",
        text: `Costume "${cosplay}"${tier ? ` tier ${tier}` : ""} tidak ditemukan di price catalog`
      }]
    };
  }

  let result = `**${match.Cosplay}**\n\n`;
  result += `🎭 Series: ${match.Series}\n`;
  result += `🏢 Brand: ${match.Brand}\n`;
  result += `💰 Tier: ${match.Tier}\n`;
  result += `📅 RYS: Rp ${match.RYS}\n`;
  result += `🎫 PPR: Rp ${match.PPR}\n`;
  result += `🛒 Purchase: Rp ${match.Purchase}`;

  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}

// MCP Streamable HTTP endpoint - GET for SSE stream
app.get("/sse", (req, res) => {
  console.log("GET /sse - Opening SSE stream");
  
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  // Keep connection alive
  res.write(": ping\n\n");
  
  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 30000);
  
  req.on("close", () => {
    clearInterval(keepAlive);
    console.log("SSE stream closed");
  });
});

// MCP Streamable HTTP endpoint - POST for requests
app.post("/sse", async (req, res) => {
  const message = req.body;
  
  console.log("Received MCP message:", JSON.stringify(message, null, 2));

  // Handle Initialize request
  if (message.method === "initialize") {
    const response = {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: {
          name: "Navi MCP Server",
          version: "1.0.0"
        },
        capabilities: {
          tools: {}
        }
      }
    };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    
    res.write(`data: ${JSON.stringify(response)}\n\n`);
    res.end();
    return;
  }

  // Handle tools/list request
  if (message.method === "tools/list") {
    const response = {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        tools: [
          {
            name: "get_stock",
            description: "Get costume stock availability from Google Sheets. Returns stock info including sizes, ETA, and availability.",
            inputSchema: {
              type: "object",
              properties: {
                costume: {
                  type: "string",
                  description: "Name of the costume to search (e.g., 'Gojo', 'Sukuna', 'Tanjiro')"
                },
                size: {
                  type: "string",
                  description: "Optional: Specific size to check (S, M, L, XL)",
                  enum: ["S", "M", "L", "XL"]
                }
              },
              required: ["costume"]
            }
          },
          {
            name: "get_reservation",
            description: "Get reservation information from Google Sheets. Shows who rented what costume and when.",
            inputSchema: {
              type: "object",
              properties: {
                cosplay: {
                  type: "string",
                  description: "Name of the cosplay to search"
                },
                size: {
                  type: "string",
                  description: "Optional: Filter by size (S, M, L, XL)"
                },
                tanggal: {
                  type: "string",
                  description: "Optional: Filter by date (e.g., '12/25', '2024-12')"
                }
              },
              required: ["cosplay"]
            }
          },
          {
            name: "get_price",
            description: "Get price catalog from Google Sheets. Shows rental prices (RYS, PPR) and purchase price.",
            inputSchema: {
              type: "object",
              properties: {
                cosplay: {
                  type: "string",
                  description: "Name of the cosplay to search"
                },
                tier: {
                  type: "string",
                  description: "Optional: Filter by tier (Basic, Medium, Premium, etc.)"
                }
              },
              required: ["cosplay"]
            }
          }
        ]
      }
    };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    
    res.write(`data: ${JSON.stringify(response)}\n\n`);
    res.end();
    return;
  }

  // Handle tools/call request
  if (message.method === "tools/call") {
    const toolName = message.params.name;
    const toolParams = message.params.arguments || {};

    try {
      let result;
      
      if (toolName === "get_stock") {
        result = await getStock(toolParams);
      } else if (toolName === "get_reservation") {
        result = await getReservation(toolParams);
      } else if (toolName === "get_price") {
        result = await getPrice(toolParams);
      } else {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: result
      };

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
    } catch (error) {
      const errorResponse = {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32603,
          message: error.message
        }
      };

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    }
    return;
  }

  // Unknown method
  const errorResponse = {
    jsonrpc: "2.0",
    id: message.id,
    error: {
      code: -32601,
      message: `Method not found: ${message.method}`
    }
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
  res.end();
});

// Health check
app.get("/", (req, res) => {
  res.json({
    name: "Navi MCP Server",
    version: "1.0.0",
    status: "running",
    protocol: "MCP Streamable HTTP",
    endpoint: "/sse"
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Navi MCP Server running on port ${PORT}`);
  console.log(`🔗 MCP Endpoint: POST /sse`);
  console.log(`📋 Health check: GET /`);
});
