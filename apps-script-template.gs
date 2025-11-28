/**
 * Google Apps Script untuk expose Google Sheets sebagai JSON API
 * 
 * CARA SETUP:
 * 1. Buka Google Sheet kamu
 * 2. Extensions → Apps Script
 * 3. Copy-paste code ini
 * 4. Deploy → New deployment
 * 5. Type: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Deploy → Copy URL
 * 9. Paste URL tersebut ke mcp-server.js
 */

function doGet() {
  try {
    // Ambil sheet aktif
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Get semua data
    var data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Baris pertama = headers
    var headers = data[0];
    var result = [];
    
    // Convert setiap row jadi object
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      result.push(row);
    }
    
    // Return JSON
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Error handling
    return ContentService.createTextOutput(
      JSON.stringify({
        error: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function - jalankan ini untuk test di Apps Script editor
 */
function testDoGet() {
  var result = doGet();
  Logger.log(result.getContent());
}
