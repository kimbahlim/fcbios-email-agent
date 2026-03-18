const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

let sheetsCache = {};
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchSheet(tabName) {
  const now = Date.now();
  if (sheetsCache[tabName] && (now - cacheTime) < CACHE_TTL) {
    console.log(`[SHEETS] Using cache for "${tabName}" (${sheetsCache[tabName].length} rows)`);
    return sheetsCache[tabName];
  }

  const url = `${BASE_URL}/values/${encodeURIComponent(tabName)}?key=${API_KEY}`;
  console.log(`[SHEETS] Fetching "${tabName}" from API...`);
  const response = await fetch(url);

  if (!response.ok) {
    console.log(`[SHEETS] Tab "${tabName}" error: ${response.status} ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  const rows = data.values || [];
  console.log(`[SHEETS] Tab "${tabName}" raw rows: ${rows.length}`);

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => (h || '').toString().trim());
  console.log(`[SHEETS] Tab "${tabName}" headers: ${headers.join(' | ')}`);
  
  const results = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] || '').toString().trim();
    });
    return obj;
  });

  // Log first row for Stock tab to verify data
  if (tabName === 'Stock' && results.length > 0) {
    console.log(`[SHEETS] Stock tab first row: ${JSON.stringify(results[0])}`);
    console.log(`[SHEETS] Stock tab total: ${results.length} items`);
  }

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
  // Post-filter: if results contain centrifuge/falcon tubes from both TARSONS and LP, remove LP duplicates
  const hasTarsonsCentrifuge = results.some(r => 
    (r._brand_tab || '').toUpperCase().includes('TARSONS') && 
    Object.values(r).join(' ').toLowerCase().match(/centrifuge|falcon|spinwin/)
  );
  if (hasTarsonsCentrifuge) {
    results = results.filter(r => {
      const isLP = (r._brand_tab || '').toUpperCase() === 'LP';
      const isCentrifuge = Object.values(r).join(' ').toLowerCase().match(/centrifuge|falcon|conical tube/);
      if (isLP && isCentrifuge) {
        console.log(`[SEARCH] Filtering out LP centrifuge tube (TARSONS has it): ${JSON.stringify(r).substring(0, 100)}`);
        return false;
      }
      return true;
    });
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
  console.log(`[STOCK] Checking stock for "${sku}" against ${rows.length} rows`);
  
  if (rows.length === 0) {
    console.log('[STOCK] Stock tab is EMPTY or not found');
    return { found: false, sku };
  }
  
  // Log first row keys to verify column names
  if (rows.length > 0) {
    console.log(`[STOCK] Column headers: ${Object.keys(rows[0]).join(', ')}`);
  }

  const skuLower = sku.toLowerCase().trim();
  const skuNoHyphen = skuLower.replace(/-/g, '');
  // Also try just the numeric/alpha part after the brand prefix
  const skuParts = sku.match(/^[A-Z0-9]+-(.+)$/i);
  const skuSuffix = skuParts ? skuParts[1].toLowerCase() : '';

  const match = rows.find(row => {
    const name = (row['NAME'] || row['name'] || row['Name'] || Object.values(row)[0] || '').toLowerCase().trim();
    const nameNoHyphen = name.replace(/-/g, '');
    
    // Try multiple matching strategies
    if (name === skuLower) return true;  // exact match
    if (name.includes(skuLower)) return true;  // name contains full sku
    if (skuLower.includes(name) && name.length > 5) return true;  // sku contains full name
    if (nameNoHyphen === skuNoHyphen) return true;  // match without hyphens
    if (nameNoHyphen.includes(skuNoHyphen)) return true;  // name (no hyphen) contains sku (no hyphen)
    if (skuNoHyphen.includes(nameNoHyphen) && nameNoHyphen.length > 5) return true;
    if (skuSuffix && name.includes(skuSuffix)) return true;  // match suffix after brand prefix
    
    return false;
  });

  if (!match) {
    console.log(`[STOCK] NOT FOUND: "${sku}"`);
    return { found: false, sku };
  }

  console.log(`[STOCK] FOUND: "${sku}" → row: ${JSON.stringify(match).substring(0, 200)}`);

  // Read availability - try exact header match first
  const availKeys = ['AVAILABLE', 'Available', 'available'];
  const uomKeys = ['PRIMARY STOCK UNIT', 'Primary Stock Unit', 'UOM', 'Uom'];
  
  let qty = '0';
  let uom = 'unit';
  
  for (const key of availKeys) {
    if (match[key] !== undefined && match[key] !== '' && !isNaN(parseFloat(match[key]))) { 
      qty = match[key]; 
      console.log(`[STOCK] Found qty via key "${key}": ${qty}`);
      break; 
    }
  }
  for (const key of uomKeys) {
    if (match[key] && match[key].toString().trim()) { 
      uom = match[key]; 
      break; 
    }
  }
  
  // Fallback: scan all values for a number
  if (qty === '0' || isNaN(parseFloat(qty))) {
    console.log(`[STOCK] Qty not found by header, scanning all values...`);
    const values = Object.entries(match);
    for (const [key, val] of values) {
      if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0 && !key.toLowerCase().includes('name') && !key.toLowerCase().includes('description') && !key.toLowerCase().includes('brand')) {
        qty = val;
        console.log(`[STOCK] Found qty via scan key "${key}": ${qty}`);
        break;
      }
    }
  }

  return {
    found: true,
    sku: match['NAME'] || match['name'] || match['Name'] || sku,
    description: match['DISPLAY NAME'] || match['Display Name'] || match['DESCRIPTION'] || '',
    brand: match['BRAND'] || match['Brand'] || '',
    qty_available: qty,
    uom: uom
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
  const brandLC = brand.toLowerCase().replace(/[^a-z0-9]/g, '');

  const match = rows.find(row => {
    const b = (row['Brand'] || row['brand'] || row['BRAND'] || '').toLowerCase();
    const bClean = b.replace(/[^a-z0-9]/g, '');
    return bClean.includes(brandLC) || brandLC.includes(bClean) || 
           b.includes(brand.toLowerCase()) || brand.toLowerCase().includes(b);
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
