import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// URLs untuk ketiga Google Sheets Apps Script endpoints
const STOCK_URL = "https://script.google.com/macros/s/AKfycbxwJ7ht-S4EzizZxkXUjkrl5PnL3nxuC4nLN-hmDMDUWSHpgdX11ucSRDy-9AiY6eI1jA/exec";
const RESERVATION_URL = "https://script.google.com/macros/s/AKfycbxPa5Bu_B-q-A925YhFF-JFW9iRDEuGI7hfKq5jSMlUHmBM46ZmsCmekG7uRQ19Zoa9/exec";
const PRICE_CATALOG_URL = "https://script.google.com/macros/s/AKfycbzStu9JYQmMWJTdASLaMnBq7BkNtMfIytK5KW4e5IzUD__MBEWsq_Vq-Vlyhdw8t4Mh/exec";

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

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Navi MCP Server",
    version: "1.0.0",
    status: "running",
    tools: [
      {
        name: "get_stock",
        description: "Get costume stock availability",
        parameters: ["costume", "size (optional)"]
      },
      {
        name: "get_reservation",
        description: "Get reservation information",
        parameters: ["cosplay", "size (optional)", "tanggal (optional)"]
      },
      {
        name: "get_price",
        description: "Get price catalog",
        parameters: ["cosplay", "tier (optional)"]
      }
    ]
  });
});

// Tool endpoints
app.post("/tools/get_stock", async (req, res) => {
  try {
    const { costume, size } = req.body;
    
    const response = await fetch(STOCK_URL);
    const rows = await response.json();

    const lower = costume.toLowerCase();
    const match = rows.find((row) => {
      const name = (row.Costume || "").toLowerCase();
      return name.includes(lower);
    });

    if (!match) {
      return res.json({
        success: false,
        message: `Costume "${costume}" tidak ditemukan di stock`
      });
    }

    let sizeInfo = {};
    if (size) {
      const upperSize = size.toUpperCase();
      const availableSizes = (match.SizeAvailable || "").toUpperCase();

      if (!availableSizes.includes(upperSize)) {
        return res.json({
          success: true,
          available: false,
          message: `Costume "${match.Costume}" tersedia, tapi size ${upperSize} tidak ada. Size available: ${match.SizeAvailable}`,
          costume: match.Costume,
          sizeAvailable: match.SizeAvailable
        });
      }

      let etaField = `ETA ${upperSize}`;
      const eta = (match[etaField] || "").toString().trim();

      sizeInfo = {
        size: upperSize,
        eta: eta,
        status: eta && eta !== "-" ? `Disewa sampai ${eta}` : "Available sekarang"
      };
    }

    res.json({
      success: true,
      data: {
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
        ...sizeInfo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/tools/get_reservation", async (req, res) => {
  try {
    const { cosplay, size, tanggal } = req.body;
    
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
      return res.json({
        success: false,
        message: `Tidak ada reservasi ditemukan untuk "${cosplay}"${size ? ` size ${size}` : ""}${tanggal ? ` pada tanggal ${tanggal}` : ""}`
      });
    }

    res.json({
      success: true,
      count: matches.length,
      data: matches.map((row) => ({
        nama: row.Nama || "",
        cosplay: row.Cosplay || "",
        size: row.Size || "",
        tier: row.Tier || "",
        rys: row.RYS || "",
        additional: row.Additional || "",
        price: row.Price || "",
        tanggal: row.Tanggal || ""
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/tools/get_price", async (req, res) => {
  try {
    const { cosplay, tier } = req.body;
    
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
      return res.json({
        success: false,
        message: `Costume "${cosplay}"${tier ? ` tier ${tier}` : ""} tidak ditemukan di price catalog`
      });
    }

    res.json({
      success: true,
      data: {
        cosplay: match.Cosplay || "",
        series: match.Series || "",
        brand: match.Brand || "",
        tier: match.Tier || "",
        rys: match.RYS || "",
        ppr: match.PPR || "",
        purchase: match.Purchase || ""
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Navi API Server running on port ${PORT}`);
  console.log(`🔗 Endpoints:`);
  console.log(`   GET  / - Server info`);
  console.log(`   POST /tools/get_stock`);
  console.log(`   POST /tools/get_reservation`);
  console.log(`   POST /tools/get_price`);
});
