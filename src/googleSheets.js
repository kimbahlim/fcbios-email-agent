const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

let sheetsCache = {};
let cacheTimes = {}; // per-tab cache timestamps
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const LEAD_TIMES_TTL = 60 * 1000; // 1 minute for LEAD_TIMES so updates are picked up quickly

async function fetchSheet(tabName) {
  const now = Date.now();
  const ttl = tabName === 'LEAD_TIMES' ? LEAD_TIMES_TTL : CACHE_TTL;
  if (sheetsCache[tabName] && (now - (cacheTimes[tabName] || 0)) < ttl) {
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
  cacheTimes[tabName] = now;
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
    // Try dotted abbreviation (CLED → C.L.E.D., EMB → E.M.B.)
    if (matches.length === 0) {
      const dottedVariants = keywords.map(k => {
        if (/^[a-z]{2,5}$/i.test(k)) {
          return [k, k.split('').join('.') + '.', k.split('').join('.')];
        }
        return [k];
      }).flat();
      const uniqueDotted = [...new Set(dottedVariants.map(v => v.toLowerCase()))];
      matches = rows.filter(row => {
        const text = Object.values(row).join(' ').toLowerCase();
        return uniqueDotted.some(v => text.includes(v));
      });
      if (matches.length > 0) {
        console.log(`[SEARCH] Found ${matches.length} results in "${tab}" using dotted abbreviation`);
      }
    }
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

  // Try 1.5: If no results, try hyphen-insensitive match (mFC matches M-FC, XLD matches X.L.D.)
  if (matches.length === 0) {
    const variants = keywords.map(k => {
      const result = [k];
      // Add dotted version for short abbreviations (CLED → C.L.E.D.)
      if (/^[a-z]{2,5}$/i.test(k)) {
        result.push(k.split('').join('.') + '.');
        result.push(k.split('').join('.'));
      }
      // Add hyphenated version (mFC → m-FC, MFC → M-F-C)
      if (/^[a-z]{2,5}$/i.test(k)) {
        result.push(k.split('').join('-'));
      }
      return result;
    }).flat();
    const uniqueVariants = [...new Set(variants.map(v => v.toLowerCase()))];
    
    // Also try matching with hyphens stripped from BOTH search term and pricelist text
    matches = rows.filter(row => {
      const text = Object.values(row).join(' ').toLowerCase();
      const textNoHyphen = text.replace(/-/g, '');
      return uniqueVariants.some(v => text.includes(v) || textNoHyphen.includes(v.replace(/-/g, '')));
    });
    if (matches.length > 0) {
      console.log(`[SEARCH] Found ${matches.length} results using abbreviation/hyphen variant`);
    }
  }

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
  
  // Generate all SKU variants to try (vendor code ↔ NetSuite code)
  const skuVariants = [skuLower];
  // If SKU doesn't start with a brand prefix like H05-, try adding common prefixes
  if (!/^[a-z]\d{2}-/i.test(sku)) {
    // Vendor code like SD153-5CT → try H05-SD153-5CT
    const prefixes = ['h05-', 'n13-', 't38-', 'r20-', 'l03-', 'm02-', 'p08-', 'b14-', 'a72-', 'c62-', 'dj01-', 'f07-'];
    for (const prefix of prefixes) {
      skuVariants.push(prefix + skuLower);
    }
  } else {
    // NetSuite code like H05-SD153-5CT → also try SD153-5CT (without prefix)
    const withoutPrefix = skuLower.replace(/^[a-z]\d{2}-/i, '');
    skuVariants.push(withoutPrefix);
  }

  const match = rows.find(row => {
    const name = (row['NAME'] || row['name'] || row['Name'] || Object.values(row)[0] || '').toLowerCase().trim();
    const nameNoHyphen = name.replace(/-/g, '');
    
    // Try all SKU variants against this row
    for (const variant of skuVariants) {
      const variantNoHyphen = variant.replace(/-/g, '');
      if (name === variant) return true;  // exact match
      if (name.includes(variant)) return true;  // name contains full sku
      if (variant.includes(name) && name.length > 5) return true;  // sku contains full name
      if (nameNoHyphen === variantNoHyphen) return true;  // match without hyphens
      if (nameNoHyphen.includes(variantNoHyphen)) return true;  // name (no hyphen) contains sku (no hyphen)
      if (variantNoHyphen.includes(nameNoHyphen) && nameNoHyphen.length > 5) return true;
    }
    // Match suffix after brand prefix ONLY if suffix contains the product code (not just pack size like 500G)
    // Suffix must be at least 6 chars and NOT be just a pack size
    if (skuSuffix && skuSuffix.length >= 6 && !/^\d+[a-z]*$/i.test(skuSuffix) && name.includes(skuSuffix)) return true;
    
    return false;
  });

  if (!match) {
    console.log(`[STOCK] NOT FOUND: "${sku}"`);
    return { found: false, sku };
  }

  console.log(`[STOCK] FOUND: "${sku}" → row: ${JSON.stringify(match).substring(0, 200)}`);

  // Read availability - ROBUST: scan all values to find the numeric quantity
  // This handles cases where columns are shifted (e.g., description text in AVAILABLE column)
  const allValues = Object.entries(match);
  let qty = '0';
  let uom = 'unit';
  
  // Strategy 1: Try AVAILABLE header first (if it's actually a number)
  const availKeys = ['AVAILABLE', 'Available', 'available'];
  for (const key of availKeys) {
    if (match[key] !== undefined && match[key] !== '' && !isNaN(parseFloat(match[key])) && parseFloat(match[key]).toString() === match[key].toString().trim()) { 
      qty = match[key]; 
      console.log(`[STOCK] Found qty via header "${key}": ${qty}`);
      break; 
    }
  }
  
  // Strategy 2: If AVAILABLE wasn't a number, scan ALL values for a number that looks like a quantity
  if (qty === '0' || isNaN(parseFloat(qty))) {
    console.log(`[STOCK] AVAILABLE header has non-numeric value, scanning all columns...`);
    for (const [key, val] of allValues) {
      const valStr = (val || '').toString().trim();
      // Skip if empty, skip NAME column, skip if it looks like a description (long text)
      if (!valStr) continue;
      if (key.toLowerCase().includes('name')) continue;
      if (key.toLowerCase().includes('brand')) continue;
      if (valStr.length > 20) continue; // descriptions are long, quantities are short
      
      const num = parseFloat(valStr);
      if (!isNaN(num) && num >= 0) {
        qty = valStr;
        console.log(`[STOCK] Found qty via scan column "${key}": ${qty}`);
        break;
      }
    }
  }
  
  // Strategy 3: Find UOM - look for values containing "/" or common unit words
  for (const [key, val] of allValues) {
    const valStr = (val || '').toString().trim();
    if (valStr && (valStr.includes('/') || valStr.toLowerCase().includes('unit') || valStr.toLowerCase().includes('case') || valStr.toLowerCase().includes('pack') || valStr.toLowerCase().includes('bottle'))) {
      // Make sure it's not the NAME or a description
      if (key.toLowerCase().includes('name') || key.toLowerCase().includes('brand')) continue;
      if (valStr.length > 30) continue;
      uom = valStr;
      console.log(`[STOCK] Found UOM: ${uom}`);
      break;
    }
  }

  return {
    found: true,
    sku: match['NAME'] || match['name'] || match['Name'] || sku,
    description: match['DISPLAY NAME'] || match['Display Name'] || match['DESCRIPTION'] || '',
    brand: match['BRAND'] || match['Brand'] || '',
    qty_available: qty,
    uom: uom,
    storage_temp: match['STORAGE TEMP'] || match['Storage Temp'] || match['STORAGE TEMPERATURE'] || '',
    shipping_condition: match['SHIPPING CONDITION'] || match['Shipping Condition'] || '',
    notes: match['DESCRIPTION 2'] || match['Description 2'] || ''
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
