const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

let sheetsCache = {};
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchSheet(tabName) {
  const now = Date.now();
  if (sheetsCache[tabName] && (now - cacheTime) < CACHE_TTL) {
    return sheetsCache[tabName];
  }

  const url = `${BASE_URL}/values/${encodeURIComponent(tabName)}?key=${API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.log(`[SHEETS] Tab "${tabName}" not found or error: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const rows = data.values || [];

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => (h || '').toString().trim());
  const results = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] || '').toString().trim();
    });
    return obj;
  });

  sheetsCache[tabName] = results;
  cacheTime = now;
  return results;
}

async function listSheets() {
  const url = `${BASE_URL}?key=${API_KEY}&fields=sheets.properties.title`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.sheets || []).map(s => s.properties.title);
}

async function searchProducts(keyword) {
  const sheets = await listSheets();
  const exclude = ['MASTER_INDEX', 'PRICE_INCREASE_2026', 'Stock', 'Nasco_Tiers', 'LEAD_TIMES', 'HIMEDIA_Not_For_Export'];
  const brandTabs = sheets.filter(s => !exclude.includes(s));

  let results = [];
  const kw = keyword.toLowerCase();
  const keywords = kw.split(/\s+/).filter(k => k.length > 1);

  // Generate code variants (e.g., B01065WA → also try B01065)
  const codeVariants = keywords.map(k => {
    const codeMatch = k.match(/^([a-z]*\d{3,})[a-z]*$/i);
    return codeMatch ? [k, codeMatch[1].toLowerCase()] : [k];
  }).flat();
  const uniqueVariants = [...new Set(codeVariants)];

  for (const tab of brandTabs) {
    const rows = await fetchSheet(tab);
    // Try ALL keywords first
    let matches = rows.filter(row => {
      const text = Object.values(row).join(' ').toLowerCase();
      return keywords.every(k => text.includes(k));
    });
    // Fallback: try any keyword or code variant
    if (matches.length === 0) {
      matches = rows.filter(row => {
        const text = Object.values(row).join(' ').toLowerCase();
        return uniqueVariants.some(k => text.includes(k));
      });
    }
    if (matches.length > 0) {
      results.push(...matches.slice(0, 10).map(m => ({ ...m, _brand_tab: tab })));
    }
  }
  return results.slice(0, 20);
}

async function searchByBrand(brandTab, keyword) {
  const rows = await fetchSheet(brandTab);
  const kw = keyword.toLowerCase();
  const keywords = kw.split(/\s+/).filter(k => k.length > 1);

  // Try 1: ALL keywords match (strictest)
  let matches = rows.filter(row => {
    const text = Object.values(row).join(' ').toLowerCase();
    return keywords.every(k => text.includes(k));
  });

  // Try 2: If no results, try partial code match (strip trailing letters from codes like B01065WA → B01065)
  if (matches.length === 0) {
    const codeVariants = keywords.map(k => {
      // If it looks like a product code (letters+digits+optional letters), try base code without trailing letters
      const codeMatch = k.match(/^([a-z]*\d{3,})[a-z]*$/i);
      return codeMatch ? [k, codeMatch[1].toLowerCase()] : [k];
    }).flat();

    const uniqueVariants = [...new Set(codeVariants)];
    matches = rows.filter(row => {
      const text = Object.values(row).join(' ').toLowerCase();
      return uniqueVariants.some(k => text.includes(k));
    });
  }

  // Try 3: If still no results, try ANY single keyword match
  if (matches.length === 0 && keywords.length > 1) {
    matches = rows.filter(row => {
      const text = Object.values(row).join(' ').toLowerCase();
      return keywords.some(k => text.includes(k));
    });
  }

  return matches.slice(0, 20);
}

async function checkStock(sku) {
  const rows = await fetchSheet('Stock');
  const skuLower = sku.toLowerCase();

  const match = rows.find(row => {
    const name = (row['NAME'] || row['name'] || row['Name'] || '').toLowerCase();
    return name.includes(skuLower) || skuLower.includes(name.replace(/^[a-z]\d+-/i, ''));
  });

  if (!match) return { found: false, sku };

  return {
    found: true,
    sku: match['NAME'] || match['name'] || match['Name'] || sku,
    description: match['DISPLAY NAME'] || match['Display Name'] || '',
    brand: match['BRAND'] || match['Brand'] || '',
    qty_available: match['AVAILABLE'] || match['Available'] || '0',
    uom: match['PRIMARY STOCK UNIT'] || match['Primary Stock Unit'] || 'unit'
  };
}

async function getNascoDealerTier(dealerName) {
  const rows = await fetchSheet('Nasco_Tiers');
  const nameLC = dealerName.toLowerCase();

  const match = rows.find(row => {
    const dealer = (row['Dealer Name'] || row['dealer_name'] || '').toLowerCase();
    return dealer.includes(nameLC) || nameLC.includes(dealer.replace(/^d\d+\s+/i, '').trim().toLowerCase());
  });

  if (!match) return { found: false, dealer_name: dealerName, tier: 'Tier 1 (<RM10K)' };

  return {
    found: true,
    dealer_name: match['Dealer Name'] || match['dealer_name'] || dealerName,
    sales_total: match['Sales Total'] || match['sales_total'] || '0',
    tier: match['Tier'] || match['tier'] || 'Tier 1 (<RM10K)'
  };
}

async function getLeadTime(brand) {
  const rows = await fetchSheet('LEAD_TIMES');
  const brandLC = brand.toLowerCase();

  const match = rows.find(row => {
    const b = (row['Brand'] || row['brand'] || row['BRAND'] || '').toLowerCase();
    return b.includes(brandLC) || brandLC.includes(b);
  });

  if (!match) return { found: false, brand };

  return {
    found: true,
    brand: match['Brand'] || match['brand'] || match['BRAND'] || brand,
    lead_time: match['Non-Stocking / Indent Lead Time'] || match['non_stocking_lead_time'] || 'Contact us for lead time'
  };
}

module.exports = {
  searchProducts,
  searchByBrand,
  checkStock,
  getNascoDealerTier,
  getLeadTime,
  listSheets,
  fetchSheet
};
