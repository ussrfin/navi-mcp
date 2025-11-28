# Navi MCP Server - Real-Time Google Sheets Integration

MCP (Model Context Protocol) Server untuk AI Agent Navi di ElevenLabs. Server ini mengintegrasikan 3 Google Sheets sebagai backend data real-time untuk costume rental business.

## 📋 Arsitektur Sistem

```
Google Sheets (3 sheets)
    ↓ (Apps Script Web API - JSON)
MCP Server (Node.js di VPS)
    ↓ (stdio)
ElevenLabs Agent (Navi)
    ↓
Customer
```

## 🗂️ Data Sources

### 1. **Stock Sheet**
Kolom: `Costume`, `ImageURL`, `Tagline/CosplayLevel`, `Tier`, `RYS`, `Size Available`, `ETA S`, `ETA M`, `ETA L`, `ETA XL`, `Includes`

### 2. **Reservation Sheet**
Kolom: `Nama`, `Cosplay`, `Size`, `Tier`, `RYS`, `Additional`, `Price`, `Tanggal`

### 3. **Price Catalog Sheet**
Kolom: `Cosplay`, `Series`, `Brand`, `Tier`, `RYS`, `PPR`, `Purchase`

## 🛠️ Setup & Installation

### Step 1: Setup Google Sheets Apps Script

Untuk setiap sheet, buat Apps Script dengan kode berikut:

```javascript
function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    result.push(row);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy sebagai **Web App** → **Anyone** → Copy URL

### Step 2: Install Dependencies di VPS

```bash
cd navi-mcp
npm install
```

### Step 3: Konfigurasi URLs

Edit `mcp-server.js`, update 3 konstanta ini dengan URL Apps Script kamu:

```javascript
const STOCK_URL = "YOUR_STOCK_APPS_SCRIPT_URL";
const RESERVATION_URL = "YOUR_RESERVATION_APPS_SCRIPT_URL";
const PRICE_CATALOG_URL = "YOUR_PRICE_CATALOG_APPS_SCRIPT_URL";
```

### Step 4: Test Server

```bash
npm start
```

Output yang diharapkan:
```
✅ Navi MCP Server running (Node.js)
📊 Tools available: get_stock, get_reservation, get_price
🔗 Connected to Google Sheets via Apps Script
```

## 🔧 MCP Tools

### 1. `get_stock`

**Deskripsi**: Mendapatkan informasi stock costume termasuk ketersediaan size, ETA, tier, dan accessories.

**Parameters**:
- `costume` (required): Nama costume (contoh: "Hu Tao")
- `size` (optional): Ukuran S/M/L/XL

**Contoh Output**:
```json
{
  "found": true,
  "row": {
    "Costume": "Hu Tao",
    "ImageURL": "https://...",
    "Tagline": "Pyro Queen",
    "Tier": "Tier 2",
    "RYS": "A",
    "SizeAvailable": "S,M,L",
    "ETA S": "",
    "ETA M": "",
    "ETA L": "2025-12-03",
    "ETA XL": "-",
    "Includes": "Staff of Homa"
  },
  "sizeInfo": {
    "size": "M",
    "eta": "",
    "status": "Available sekarang"
  }
}
```

### 2. `get_reservation`

**Deskripsi**: Mendapatkan informasi reservasi/booking costume.

**Parameters**:
- `cosplay` (required): Nama cosplay
- `size` (optional): Ukuran S/M/L/XL
- `tanggal` (optional): Format YYYY-MM-DD

**Contoh Output**:
```json
{
  "found": true,
  "count": 1,
  "reservations": [
    {
      "Nama": "Alex",
      "Cosplay": "Hu Tao",
      "Size": "M",
      "Tier": "Tier 2",
      "RYS": "A",
      "Additional": "",
      "Price": "400000",
      "Tanggal": "2025-12-02"
    }
  ]
}
```

### 3. `get_price`

**Deskripsi**: Mendapatkan informasi harga sewa, brand, series, dan harga beli costume.

**Parameters**:
- `cosplay` (required): Nama cosplay
- `tier` (optional): Tier 1/2/3

**Contoh Output**:
```json
{
  "found": true,
  "row": {
    "Cosplay": "Hu Tao",
    "Series": "Genshin Impact",
    "Brand": "Yangyangwucos",
    "Tier": "Tier 2",
    "RYS": "A",
    "PPR": "400000",
    "Purchase": "IDR 1500000"
  }
}
```

## 🤖 ElevenLabs Integration

### Setup MCP di ElevenLabs

1. Masuk ke **ElevenLabs Dashboard** → **Agents** → Pilih agent "Navi"
2. Ke menu **MCP (Model Context Protocol)**
3. Add MCP Server:
   - **Command**: `node`
   - **Args**: `/path/to/navi-mcp/mcp-server.js` (path absolut di VPS kamu)
   - **Environment**: (kosongkan atau sesuai kebutuhan)
4. **Activate** ketiga tools: `get_stock`, `get_reservation`, `get_price`

### System Prompt untuk Navi

Tambahkan ini di **System Prompt** agent Navi:

```
Kamu adalah Navi, AI assistant untuk costume rental business. 

WAJIB menggunakan tools berikut untuk menjawab pertanyaan customer:

1. get_stock - Untuk pertanyaan tentang:
   - Ketersediaan costume
   - Size yang tersedia
   - Kapan costume available (ETA)
   - Accessories/includes apa saja
   - Detail tier dan tagline

2. get_reservation - Untuk pertanyaan tentang:
   - Siapa yang booking costume tertentu
   - Jadwal booking/reservasi
   - Harga booking customer tertentu

3. get_price - Untuk pertanyaan tentang:
   - Harga sewa (PPR)
   - Brand/series costume
   - Tier pricing
   - Harga beli (Purchase)

ATURAN PENTING:
- SELALU gunakan tools untuk jawab pertanyaan data, JANGAN menebak
- Jika ETA kosong atau "-" → costume available sekarang
- Jika ETA ada tanggal → costume sedang disewa sampai tanggal tersebut
- Jika data tidak ditemukan (found: false) → jelaskan dengan sopan, tawarkan alternatif
- Gunakan semua field yang dikembalikan tools untuk memberikan jawaban lengkap
- Berbahasa Indonesia dengan ramah dan profesional
```

## 📊 Use Cases

### Customer bertanya: "Apakah Hu Tao size M tersedia?"

1. Navi call `get_stock(costume="Hu Tao", size="M")`
2. MCP server fetch dari STOCK_URL
3. Return data dengan `sizeInfo.status`
4. Navi jawab: "Hu Tao size M available sekarang! Tier 2, include Staff of Homa. Harga sewa?"

### Customer bertanya: "Berapa harga sewa Hu Tao?"

1. Navi call `get_price(cosplay="Hu Tao")`
2. Return PPR = "400000"
3. Navi jawab: "Harga sewa Hu Tao adalah Rp 400.000 per hari. Brand Yangyangwucos, series Genshin Impact."

### Customer bertanya: "Kapan Raiden size L available?"

1. Navi call `get_stock(costume="Raiden", size="L")`
2. Return `ETA L = "2025-12-05"`
3. Navi jawab: "Raiden size L sedang disewa, available kembali tanggal 5 Desember 2025."

## 🚀 Deployment ke VPS

### Requirements
- Node.js >= 18
- npm
- VPS dengan akses SSH
- Domain/IP VPS accessible dari ElevenLabs

### Steps

```bash
# 1. Clone/upload project ke VPS
scp -r navi-mcp user@your-vps-ip:/home/user/

# 2. SSH ke VPS
ssh user@your-vps-ip

# 3. Install dependencies
cd /home/user/navi-mcp
npm install

# 4. Test run
npm start

# 5. Setup PM2 untuk auto-restart (optional)
npm install -g pm2
pm2 start mcp-server.js --name navi-mcp
pm2 save
pm2 startup
```

## 🔒 Security Notes

- Apps Script URLs yang di-deploy sebagai "Anyone" bisa diakses publik
- Pastikan tidak ada sensitive data di sheet yang di-expose
- Pertimbangkan rate limiting jika traffic tinggi
- Untuk production, gunakan authentication di Apps Script

## 📝 Troubleshooting

### Error: Cannot find module '@modelcontextprotocol/sdk'
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: fetch failed / CORS
- Pastikan Apps Script sudah di-deploy dengan akses "Anyone"
- Test URL di browser, harus return JSON array

### ElevenLabs tidak bisa connect ke MCP
- Pastikan path absolut ke mcp-server.js benar
- Check logs di ElevenLabs MCP console
- Test manual: `node mcp-server.js` di terminal

## 📚 Resources

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [ElevenLabs MCP Guide](https://elevenlabs.io/docs/mcp)
- [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)

## 📄 License

ISC

---

**Dibuat untuk UAS - Integrasi AI Agent dengan Real-Time Data Backend**
