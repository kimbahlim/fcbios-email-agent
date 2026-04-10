const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

// Chemical/media synonym mapping — automatically expands search terms
// Key = what dealers commonly say, Value = what's in the pricelist
const SEARCH_SYNONYMS = {
  'polysorbate 80': ['tween 80', 'GRM159'],
  'polysorbate 20': ['tween 20', 'GRM156', 'MB067', 'PCT1310', 'TC287'],
  'methylparaben': ['methyl 4-hydroxybenzoate', 'GRM1899'],
  'methyl paraben': ['methyl 4-hydroxybenzoate', 'GRM1899'],
  'propylparaben': ['propyl 4-hydroxybenzoate', 'GRM1900'],
  'propyl paraben': ['propyl 4-hydroxybenzoate', 'GRM1900'],
  'polyethylene glycol': ['PEG'],
  'tryptone sodium chloride': ['tryptone salt', 'M1500I'],
  'tryptone nacl': ['tryptone salt', 'M1500I'],
  'tryptose sodium chloride': ['tryptone salt', 'M1500I'],
  'meat extract': ['HM extract', 'RM003'],
  'bacteriological agar': ['agar powder', 'GRM026', 'M1375'],
  'casein digest': ['tryptone', 'casitose'],
  'pancreatic digest of casein': ['tryptone', 'casitose', 'RM014'],
  'scdlp': ['casein digest soy lecithin polysorbate', 'M2059', 'MAP117'],
  'fluid casein digest': ['MAP117', 'M2059', 'casein digest soy lecithin polysorbate'],
  'casein digest soy lecithin': ['MAP117', 'M2059'],
  'lecithin polysorbate': ['MAP117', 'M2059', 'casein digest soy lecithin'],
  'phosphate buffered saline': ['PBS', 'TL1031', 'M1866'],
  'thioglycolic acid': ['mercaptoacetic acid', 'GRM617'],
  'carbopol 974': ['carbopol', 'GRM2033'],
  'buffered nacl peptone': ['buffered sodium chloride peptone', 'M1275', 'MH1275'],
  'buffered sodium chloride peptone': ['buffered nacl peptone', 'M1275', 'MH1275'],
  'potassium dihydrogen phosphate': ['potassium biphosphate', 'GRM249'],
  'tryptic soy agar': ['tryptone soya agar', 'M290', 'M1968'],
  'tryptic soya agar': ['tryptone soya agar', 'M290', 'M1968'],
};

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

  // Auto-expand synonyms: check if the full keyword or any partial matches a known synonym
  let synonymKeywords = [];
  for (const [term, alternatives] of Object.entries(SEARCH_SYNONYMS)) {
    if (kw.includes(term) || term.includes(kw)) {
      synonymKeywords.push(...alternatives.map(a => a.toLowerCase()));
      console.log(`[SEARCH] Synonym expansion: "${kw}" → also trying: ${alternatives.join(', ')}`);
    }
  }

  // For HiMedia tabs: if keyword looks like a series code (e.g. "M290", "M144"),
  // also search by the numeric part alone so MH290, GM290, GMH290 etc. are all found
  let expandedKeywords = [...keywords];
  if (brandTab.toLowerCase().includes('himedia')) {
    keywords.forEach(k => {
      // Match HiMedia series prefixes: M, MH, GM, GMH, MV, MM, CMS, FD, SD, LQ, RM, GRM
      const seriesMatch = k.match(/^(gmh|grm|cms|mh|gm|mv|mm|lq|fd|sd|rm|m)(\d+.*)$/i);
      if (seriesMatch) {
        const numericPart = seriesMatch[2].toLowerCase();
        if (!expandedKeywords.includes(numericPart)) {
          expandedKeywords.push(numericPart);
          console.log(`[SEARCH] HiMedia series strip: "${k}" → also searching "${numericPart}"`);
        }
      }
    });
  }

  // Try 1: ALL keywords match (strictest) — use expandedKeywords to catch all HiMedia series
  // Also create slash/space-normalized versions for MVE-style models (SC4/3V → sc 4 / 3 v, sc4/3v, sc 4/3 v etc.)
  const kwNormalized = kw.replace(/[\/\s]+/g, '');  // strip all slashes and spaces
  let matches = rows.filter(row => {
    const text = Object.values(row).join(' ').toLowerCase();
    const textNormalized = text.replace(/[\/\s]+/g, '');  // normalize pricelist text too
    // Quick check: if slash-normalized keyword matches slash-normalized text, it's a hit
    if (kwNormalized.length >= 3 && textNormalized.includes(kwNormalized)) return true;
    // For HiMedia with expanded keywords: match if ANY expanded keyword variant matches ALL original keywords
    // OR if the expanded numeric part alone matches
    if (expandedKeywords.length > keywords.length) {
      // Try original keywords first
      if (keywords.every(k => text.includes(k))) return true;
      // Try with numeric part — matches MH290, GM290 etc. when searching M290
      const numericKeys = expandedKeywords.filter(k => !keywords.includes(k));
      return numericKeys.some(nk => text.includes(nk));
    }
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

  // Try 1.8: If no results and keyword ends with digit "1", retry with letter "I" (common HiMedia typo: M19901 → M1990I)
  if (matches.length === 0) {
    const i1Variants = keywords.filter(k => /\d1$/.test(k)).map(k => k.slice(0, -1) + 'i');
    if (i1Variants.length > 0) {
      console.log(`[SEARCH] Trying I/1 swap: ${i1Variants.join(', ')}`);
      matches = rows.filter(row => {
        const text = Object.values(row).join(' ').toLowerCase();
        return i1Variants.some(v => text.includes(v));
      });
      if (matches.length > 0) {
        console.log(`[SEARCH] Found ${matches.length} results after I/1 swap`);
      }
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

  // Try 4: If still no results, try synonym keywords
  if (matches.length === 0 && synonymKeywords.length > 0) {
    matches = rows.filter(row => {
      const text = Object.values(row).join(' ').toLowerCase();
      return synonymKeywords.some(sk => text.includes(sk));
    });
    if (matches.length > 0) {
      console.log(`[SEARCH] Found ${matches.length} results using synonym expansion`);
    }
  }

  // Post-filter for HiMedia: remove PCT (Plant Cell/Tissue Culture) results
  // when non-PCT alternatives exist, unless context explicitly mentions plant culture
  if (brandTab.toLowerCase().includes('himedia') && matches.length > 0) {
    const hasPCT = matches.some(r => Object.values(r).join(' ').toLowerCase().includes('pct'));
    const hasNonPCT = matches.some(r => !Object.values(r).join(' ').toLowerCase().includes('pct'));
    if (hasPCT && hasNonPCT) {
      const filtered = matches.filter(r => !Object.values(r).join(' ').toLowerCase().includes('pct'));
      console.log(`[SEARCH] Filtered out ${matches.length - filtered.length} PCT (plant tissue culture) result(s) — non-PCT alternatives exist`);
      matches = filtered;
    }
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
  
  // TOMY accessories: F07 and T01 are interchangeable prefixes for same products
  if (skuLower.startsWith('f07-')) {
    skuVariants.push('t01-' + skuLower.substring(4));
    console.log(`[STOCK] TOMY cross-ref: also checking T01-${skuLower.substring(4)}`);
  } else if (skuLower.startsWith('t01-')) {
    skuVariants.push('f07-' + skuLower.substring(4));
    console.log(`[STOCK] TOMY cross-ref: also checking F07-${skuLower.substring(4)}`);
  }
  
  // NASCO: pricelist has "WA" suffix (e.g., N02-B01065WA) but Stock tab doesn't (N02-B01065)
  if (skuLower.startsWith('n02-') && skuLower.endsWith('wa')) {
    const withoutWA = skuLower.slice(0, -2);
    skuVariants.push(withoutWA);
    console.log(`[STOCK] NASCO: also checking without WA suffix: ${withoutWA}`);
  } else if (skuLower.startsWith('n02-') && !skuLower.endsWith('wa')) {
    skuVariants.push(skuLower + 'wa');
    console.log(`[STOCK] NASCO: also checking with WA suffix: ${skuLower}wa`);
  }
  
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
      if (name.includes(variant) && variant.length >= 6) return true;  // name contains full sku (min 6 chars to avoid false matches)
      if (variant.includes(name) && name.length > 5) return true;  // sku contains full name
      if (nameNoHyphen === variantNoHyphen) return true;  // match without hyphens
      if (nameNoHyphen.includes(variantNoHyphen) && variantNoHyphen.length >= 6) return true;  // name (no hyphen) contains sku (min 6 chars)
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
  fetchSheet,
  recommendRotor
};

// Rotor recommendation tool for Gyrozen centrifuges
async function recommendRotor(model, tubeType, tubeSize, quantity) {
  const rows = await fetchSheet('GYROZEN - ROTOR SELECTION GUIDE');
  
  // Normalize inputs
  const modelStr = String(model).toLowerCase().replace(/[^a-z0-9]/g, '');
  const tubeTypeStr = (tubeType || '').toLowerCase();
  const tubeSizeStr = (tubeSize || '').toLowerCase();
  const qty = parseInt(quantity) || 0;
  
  console.log(`[ROTOR] Searching for model=${model}, tube=${tubeType}, size=${tubeSize}, qty=${quantity}`);
  
  // Step 1: Find all main rotor entries for this centrifuge model
  const mainEntries = rows.filter(row => {
    const cm = String(row['Centrifuge Model'] || '').toLowerCase().replace(/[^a-z0-9\/]/g, '');
    return cm.includes(modelStr) || cm === modelStr;
  });
  
  if (mainEntries.length === 0) {
    return { found: false, message: `No rotors found for centrifuge model "${model}". Available models: Mini (1312), 1524, 1536, 1730R, 1848R, 406, 416, 624R, 1248/1248R/1236R, 1580/1580R, 1696R, 1736R, 2236R` };
  }
  
  // Step 2: Parse capacity strings to calculate total tube count
  function parseCapacity(capStr) {
    if (!capStr) return { total: 0, perBucket: 0, buckets: 0, tubeML: '', desc: '' };
    const s = String(capStr).trim();
    
    // Pattern: "4 x 2 x 15 mL" = 4 buckets × 2 tubes = 8 tubes of 15mL
    let match = s.match(/(\d+)\s*x\s*(\d+)\s*x\s*([\d.]+)\s*(mL|ml)/i);
    if (match) {
      const buckets = parseInt(match[1]);
      const perBucket = parseInt(match[2]);
      return { total: buckets * perBucket, perBucket, buckets, tubeML: match[3], desc: s };
    }
    
    // Pattern: "6 x 2 x vacuum tube" = 6 buckets × 2 tubes
    match = s.match(/(\d+)\s*x\s*(\d+)\s*x\s*(.*)/i);
    if (match) {
      const buckets = parseInt(match[1]);
      const perBucket = parseInt(match[2]);
      return { total: buckets * perBucket, perBucket, buckets, tubeML: match[3].trim(), desc: s };
    }
    
    // Pattern: "4 x 50 mL" = 4 tubes of 50mL  
    match = s.match(/(\d+)\s*x\s*([\d.]+)\s*(mL|ml)/i);
    if (match) {
      return { total: parseInt(match[1]), perBucket: 1, buckets: parseInt(match[1]), tubeML: match[2], desc: s };
    }
    
    // Pattern: "4 x 100 mL"
    match = s.match(/(\d+)\s*x\s*(.*)/i);
    if (match) {
      return { total: parseInt(match[1]), perBucket: 1, buckets: parseInt(match[1]), tubeML: match[2].trim(), desc: s };
    }
    
    // Pattern: "16 x 15 mL / 16 x vacuum tube"
    match = s.match(/(\d+)\s*x\s*([\d.]+)\s*(mL|ml)/i);
    if (match) {
      return { total: parseInt(match[1]), perBucket: 0, buckets: 0, tubeML: match[2], desc: s };
    }
    
    return { total: 0, perBucket: 0, buckets: 0, tubeML: '', desc: s };
  }
  
  // Step 3: Score each rotor entry for relevance
  const scored = mainEntries.map(entry => {
    const cap = parseCapacity(entry['Max Capacity']);
    const rotorType = String(entry['Rotor Type'] || '').toLowerCase();
    const bucketStr = String(entry['Bucket Cat No'] || '').toLowerCase();
    const capStr = String(entry['Max Capacity'] || '').toLowerCase();
    
    let score = 0;
    let reasons = [];
    
    // Match tube size (15ml, 50ml, etc.)
    if (tubeSizeStr && (capStr.includes(tubeSizeStr) || capStr.includes(tubeSizeStr.replace('ml', ' ml')))) {
      score += 10;
      reasons.push('tube size match');
    }
    
    // Match tube type keywords (conical, vacuum, round, microplate)
    if (tubeTypeStr) {
      if (tubeTypeStr.includes('conical') && capStr.includes('conical')) { score += 5; reasons.push('conical match'); }
      if (tubeTypeStr.includes('vacuum') && capStr.includes('vacuum')) { score += 5; reasons.push('vacuum tube match'); }
      if (tubeTypeStr.includes('round') && !capStr.includes('conical')) { score += 3; reasons.push('round bottom'); }
      if (tubeTypeStr.includes('plate') && capStr.includes('plate')) { score += 5; reasons.push('plate match'); }
      if (tubeTypeStr.includes('blood') && capStr.includes('vacuum')) { score += 5; reasons.push('blood/vacuum match'); }
    }
    
    // Match swing-out preference
    if (tubeTypeStr.includes('swing') && (rotorType.includes('swing') || rotorType.includes('wing'))) {
      score += 3;
      reasons.push('swing-out match');
    }
    
    // Capacity meets requirement
    if (qty > 0 && cap.total >= qty) {
      score += 8;
      reasons.push(`capacity ${cap.total} >= ${qty} required`);
    } else if (qty > 0 && cap.total > 0 && cap.total < qty) {
      score -= 5;
      reasons.push(`capacity ${cap.total} < ${qty} required — INSUFFICIENT`);
    }
    
    // Prefer exact capacity match over oversized
    if (qty > 0 && cap.total === qty) {
      score += 3;
      reasons.push('exact capacity match');
    }
    
    return {
      rotor: entry['Rotor Cat No'],
      rotorType: entry['Rotor Type'],
      bucket: entry['Bucket Cat No'],
      capacity: entry['Max Capacity'],
      parsedCapacity: cap,
      maxRPM: entry['Max RPM'],
      maxRCF: entry['Max RCF (xg)'],
      holeDiameter: entry['Hole Diameter (mm)'],
      maxTubeHeight: entry['Max Tube Height (mm)'],
      notes: entry['Notes'],
      score,
      reasons
    };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Step 4: Find accessory rows (adapters, extra buckets) for the top recommendations
  const topRotors = scored.slice(0, 5);
  const accessories = [];
  for (const rotor of topRotors) {
    const rotorName = rotor.rotor;
    if (!rotorName) continue;
    const accRows = rows.filter(row => {
      const bucketDesc = String(row['Bucket Cat No'] || '');
      const rotorRef = String(row['Rotor Cat No'] || '');
      return !row['Centrifuge Model'] && (bucketDesc.includes(rotorName) || rotorRef.includes(rotorName));
    });
    for (const acc of accRows) {
      accessories.push({
        forRotor: rotorName,
        type: acc['Rotor Type'],
        catNo: acc['Rotor Cat No'],
        description: acc['Bucket Cat No'],
        capacity: acc['Max Capacity'],
        notes: acc['Notes']
      });
    }
  }
  
  return {
    found: true,
    model: model,
    query: { tubeType, tubeSize, quantity: qty },
    recommendations: topRotors,
    accessories,
    totalOptions: mainEntries.length
  };
}
