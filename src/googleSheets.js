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

// Parse pack structure from description string.
// Used when pricelist row has no explicit Bag Price/Bag Qty columns but description
// embeds pack/case structure like "500/pack, 5000/case" or "100bags/box, 6boxes/case".
// Returns { qty_per_pack, qty_per_case, packs_per_case } or null.
// IMPORTANT: This only describes physical pack structure. Whether the agent should QUOTE
// loose pack pricing is still gated by the case_only flag from checkStock (decimal stock = OK,
// whole-number stock = case-only). See test-pack-parser.js for regression tests.
function parsePackStructure(description) {
  if (!description || typeof description !== 'string') return null;
  const desc = description.toLowerCase();

  // Pattern A: "X/pack, Y/case" or "Xpcs/box, Y/case" or "Xpcs/bag, Y/case"
  // Allows commas in numbers like "30,000"; allows optional pcs/units between number and slash
  // Examples: "500/pack, 5000/case", "500pcs/box, 5000/case", "1000/pack, 30,000/case"
  const patternA = /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:pcs?|units?)?\s*\/\s*(?:pack|box|bag)\s*,?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:pcs?|units?)?\s*\/\s*case/i;
  const matchA = desc.match(patternA);
  if (matchA) {
    const qtyPerPack = parseInt(matchA[1].replace(/,/g, ''), 10);
    const qtyPerCase = parseInt(matchA[2].replace(/,/g, ''), 10);
    if (qtyPerPack > 0 && qtyPerCase > qtyPerPack && qtyPerCase % qtyPerPack === 0) {
      return {
        qty_per_pack: qtyPerPack,
        qty_per_case: qtyPerCase,
        packs_per_case: qtyPerCase / qtyPerPack,
        pattern: 'A: X/pack, Y/case'
      };
    }
  }

  // Pattern B: "Xpcs/bag, Ybags/box, Zboxes/case" — three-level structure (e.g. inoculating loops)
  const patternB = /(\d+)\s*pcs?\s*\/\s*bag\s*,?\s*(\d+)\s*bags?\s*\/\s*box\s*,?\s*(\d+)\s*box(?:es)?\s*\/\s*case/i;
  const matchB = desc.match(patternB);
  if (matchB) {
    const pcsPerBag = parseInt(matchB[1], 10);
    const bagsPerBox = parseInt(matchB[2], 10);
    const boxesPerCase = parseInt(matchB[3], 10);
    const qtyPerPack = pcsPerBag * bagsPerBox; // pack unit = box
    const qtyPerCase = qtyPerPack * boxesPerCase;
    return {
      qty_per_pack: qtyPerPack,
      qty_per_case: qtyPerCase,
      packs_per_case: boxesPerCase,
      pattern: 'B: pcs/bag, bags/box, boxes/case'
    };
  }

  return null;
}

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

  // Inject pricing-availability flags (same as searchByBrand)
  const enrichedAll = results.slice(0, 20).map(row => {
    const keys = Object.keys(row);
    const findKey = (...patterns) => keys.find(k => patterns.some(p => k.toLowerCase().includes(p)));
    const bagPriceKey = findKey('bag price', 'pack price', 'bag dealer price');
    const bagQtyKey = findKey('bag qty', 'pack qty', 'qty/bag', 'qty/pack', 'units/bag', 'units/pack');
    const bagPriceVal = bagPriceKey ? row[bagPriceKey] : null;
    const bagQtyVal = bagQtyKey ? row[bagQtyKey] : null;
    const hasExplicitPackCols = !!(bagPriceVal && String(bagPriceVal).trim() !== '' && bagQtyVal && String(bagQtyVal).trim() !== '');

    // Fallback: parse pack structure from description string
    // Used when sheet has no explicit Bag Price/Bag Qty columns but description embeds the structure
    const descKey = findKey('description', 'display name');
    const descVal = descKey ? row[descKey] : '';
    const packStructure = !hasExplicitPackCols ? parsePackStructure(descVal) : null;

    let pricingNote;
    if (hasExplicitPackCols) {
      pricingNote = null;
    } else if (packStructure) {
      pricingNote = `Pack structure parsed from description: ${packStructure.qty_per_pack}/pack, ${packStructure.packs_per_case} packs per case. Loose pack pricing IS available IF stock check returns case_only=false (i.e. decimal stock qty). Compute pack price = (case price ÷ ${packStructure.packs_per_case}) × 1.10, rounded UP to nearest RM. If case_only=true, leave Pack columns blank.`;
    } else {
      pricingNote = 'NO PACK PRICING AVAILABLE — this item is sold by the case ONLY. Pricelist row has no Bag Price/Bag Qty columns and description has no parseable pack/case structure. Agent MUST leave Pack columns blank in quote. NEVER fabricate pack pricing by dividing case price.';
    }

    return {
      ...row,
      _has_pack_pricing: hasExplicitPackCols || !!packStructure,
      _pack_structure: packStructure,
      _pricing_note: pricingNote
    };
  });
  return enrichedAll;
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
        // Only expand if numeric part is 4+ chars to avoid overly generic matches (e.g., "007" from "rm007" matches too many)
        if (numericPart.length >= 4 && !expandedKeywords.includes(numericPart)) {
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

  // Inject explicit pricing-availability flags into each row so agent can't fabricate pack pricing
  const enriched = matches.slice(0, 20).map(row => {
    // Detect bag/pack columns (case-insensitive key match)
    const keys = Object.keys(row);
    const findKey = (...patterns) => keys.find(k => patterns.some(p => k.toLowerCase().includes(p)));
    const bagPriceKey = findKey('bag price', 'pack price', 'bag dealer price');
    const bagQtyKey = findKey('bag qty', 'pack qty', 'qty/bag', 'qty/pack', 'units/bag', 'units/pack');
    const bagPriceVal = bagPriceKey ? row[bagPriceKey] : null;
    const bagQtyVal = bagQtyKey ? row[bagQtyKey] : null;
    const hasExplicitPackCols = !!(bagPriceVal && String(bagPriceVal).trim() !== '' && bagQtyVal && String(bagQtyVal).trim() !== '');

    // Fallback: parse pack structure from description string
    const descKey = findKey('description', 'display name');
    const descVal = descKey ? row[descKey] : '';
    const packStructure = !hasExplicitPackCols ? parsePackStructure(descVal) : null;

    let pricingNote;
    if (hasExplicitPackCols) {
      pricingNote = null;
    } else if (packStructure) {
      pricingNote = `Pack structure parsed from description: ${packStructure.qty_per_pack}/pack, ${packStructure.packs_per_case} packs per case. Loose pack pricing IS available IF stock check returns case_only=false (i.e. decimal stock qty). Compute pack price = (case price ÷ ${packStructure.packs_per_case}) × 1.10, rounded UP to nearest RM. If case_only=true, leave Pack columns blank.`;
    } else {
      pricingNote = 'NO PACK PRICING AVAILABLE — this item is sold by the case ONLY. Pricelist row has no Bag Price/Bag Qty columns and description has no parseable pack/case structure. Agent MUST leave Pack columns blank in quote. NEVER fabricate pack pricing by dividing case price.';
    }

    return {
      ...row,
      _has_pack_pricing: hasExplicitPackCols || !!packStructure,
      _pack_structure: packStructure,
      _pricing_note: pricingNote
    };
  });

  // HIMEDIA VARIANT GROUPING (M/MH/GM/GMH/MV series priority)
  // When multiple variants of the same HiMedia code appear in results, mark the recommended one
  // M-series-priority rule: when dealer hasn't specified a series, prefer cheapest M > MH > GM > GMH > MV
  if (brandTab && brandTab.toUpperCase().includes('HIMEDIA')) {
    // Extract HiMedia code (digits) and series prefix from SKU
    // e.g. H05-M929-500G → series=M, code=929, size=500G
    // e.g. H05-GMH096-100G → series=GMH, code=096, size=100G
    const parseHimediaSku = (sku) => {
      if (!sku) return null;
      const m = String(sku).match(/^H05-(MCD|GMH|MH|GM|MV|CMS|MM|M)([0-9]+[A-Z]?)-([0-9.]+[A-Z]+)$/i);
      if (!m) return null;
      return { series: m[1].toUpperCase(), code: m[2], size: m[3].toUpperCase() };
    };

    // Series priority for generic dealer requests (lower number = higher priority)
    const SERIES_PRIORITY = { 'M': 1, 'MH': 2, 'GM': 3, 'GMH': 4, 'MV': 5, 'CMS': 6, 'MM': 7, 'MCD': 99 }; // MCD blocked anyway

    // Group enriched results by code+size
    const groups = {};
    enriched.forEach(row => {
      const skuKey = Object.keys(row).find(k => k.toLowerCase().includes('netsuite') && k.toLowerCase().includes('code'));
      if (!skuKey) return;
      const parsed = parseHimediaSku(row[skuKey]);
      if (!parsed) return;
      const groupKey = `${parsed.code}-${parsed.size}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push({ row, parsed });
    });

    // For each group with multiple variants, mark the recommended one
    Object.entries(groups).forEach(([groupKey, items]) => {
      if (items.length < 2) return; // single variant, nothing to recommend
      // Sort by series priority, then by price (ascending)
      const priceKey = Object.keys(items[0].row).find(k => k.toLowerCase().includes('dealer price') || k.toLowerCase() === 'price');
      items.sort((a, b) => {
        const pA = SERIES_PRIORITY[a.parsed.series] ?? 999;
        const pB = SERIES_PRIORITY[b.parsed.series] ?? 999;
        if (pA !== pB) return pA - pB;
        const priceA = priceKey ? parseFloat(a.row[priceKey]) || Infinity : Infinity;
        const priceB = priceKey ? parseFloat(b.row[priceKey]) || Infinity : Infinity;
        return priceA - priceB;
      });
      // The first item in sorted order is the recommended default
      const recommended = items[0];
      const alternateVariants = items.slice(1).map(i => `${i.parsed.series}${i.parsed.code} (${i.parsed.series} series)`).join(', ');
      recommended.row._himedia_recommended_default = true;
      recommended.row._himedia_variant_note = `RECOMMENDED DEFAULT for generic dealer requests (no specific series asked). M-series-priority rule: M > MH > GM > GMH > MV. Other variants exist for this product code: ${alternateVariants}. Only quote the alternate variant if dealer explicitly requested that series (e.g., asked for MH for pharmaceutical/USP harmonised, asked for MV for vegan/HiVeg, asked for GM for granulated).`;
      // Mark the non-recommended ones
      items.slice(1).forEach(item => {
        item.row._himedia_recommended_default = false;
        item.row._himedia_variant_note = `NOT recommended default — this is the ${item.parsed.series} variant (${item.parsed.series === 'GM' ? 'Granulated' : item.parsed.series === 'GMH' ? 'Granulated Harmonised' : item.parsed.series === 'MH' ? 'Harmonised pharmacopeia' : item.parsed.series === 'MV' ? 'HiVeg vegan' : item.parsed.series === 'CMS' ? 'Certified' : item.parsed.series === 'MM' ? 'Modified formulation' : 'specialty'}). The recommended default is ${recommended.parsed.series}${recommended.parsed.code}. Only quote this variant if dealer explicitly requested the ${item.parsed.series} series.`;
      });
    });
    console.log(`[SEARCH] HiMedia variant grouping: ${Object.values(groups).filter(g => g.length > 1).length} multi-variant groups marked with recommended defaults`);
  }

  return enriched;
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
  
  // TARSONS Y/B color suffix tolerance: Pricelist sometimes has T38-521014 but NetSuite has T38-521014Y
  // Try both with and without Y/B suffix to handle the mismatch
  if (skuLower.startsWith('t38-')) {
    if (skuLower.endsWith('y') || skuLower.endsWith('b')) {
      // Has color suffix — also try without
      const withoutSuffix = skuLower.slice(0, -1);
      skuVariants.push(withoutSuffix);
      console.log(`[STOCK] TARSONS: also checking without color suffix: ${withoutSuffix}`);
    } else if (/t38-\d+$/.test(skuLower)) {
      // Pure numeric — also try with Y and B suffixes
      skuVariants.push(skuLower + 'y');
      skuVariants.push(skuLower + 'b');
      console.log(`[STOCK] TARSONS: also checking with Y/B color suffixes: ${skuLower}y, ${skuLower}b`);
    }
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

  // First pass: try EXACT match only
  let match = rows.find(row => {
    const name = (row['NAME'] || row['name'] || row['Name'] || Object.values(row)[0] || '').toLowerCase().trim();
    const nameNoHyphen = name.replace(/-/g, '');
    for (const variant of skuVariants) {
      const variantNoHyphen = variant.replace(/-/g, '');
      if (name === variant) return true;
      if (nameNoHyphen === variantNoHyphen) return true;
    }
    return false;
  });

  // Second pass: try substring match (only if exact match failed)
  if (!match) {
    match = rows.find(row => {
    const name = (row['NAME'] || row['name'] || row['Name'] || Object.values(row)[0] || '').toLowerCase().trim();
    const nameNoHyphen = name.replace(/-/g, '');
    
    // Try all SKU variants against this row
    for (const variant of skuVariants) {
      const variantNoHyphen = variant.replace(/-/g, '');
      if (name.includes(variant) && variant.length >= 6) return true;  // name contains full sku (min 6 chars to avoid false matches)
      if (variant.includes(name) && name.length > 5) return true;  // sku contains full name
      if (nameNoHyphen.includes(variantNoHyphen) && variantNoHyphen.length >= 6) return true;  // name (no hyphen) contains sku (min 6 chars)
      if (variantNoHyphen.includes(nameNoHyphen) && nameNoHyphen.length > 5) return true;
    }
    // Match suffix after brand prefix ONLY if suffix contains the product code (not just pack size like 500G)
    // Suffix must be at least 6 chars and NOT be just a pack size
    if (skuSuffix && skuSuffix.length >= 6 && !/^\d+[a-z]*$/i.test(skuSuffix) && name.includes(skuSuffix)) return true;
    
    return false;
  });
  }

  if (!match) {
    console.log(`[STOCK] NOT FOUND: "${sku}"`);
    // CASE-ONLY ENFORCEMENT for indent items: DispoZ indent items are also case-only (no loose packs available without stock)
    const TRANSFER_PIPETTE_EXC = ['dj01-la1n00310505', 'dj01-la2n00330505'];
    const skuLC = sku.toString().toLowerCase().trim();
    const isDispoZIndent = (skuLC.startsWith('dz02-') || skuLC.startsWith('dj01-')) && !TRANSFER_PIPETTE_EXC.some(e => skuLC.includes(e));
    const TARSONS_CASE_ONLY = ['t38-546021', 't38-546041', 't38-500031', 't38-500041'];
    const isTarsonsCO = TARSONS_CASE_ONLY.some(c => skuLC.includes(c));
    const indentCaseOnly = isDispoZIndent || isTarsonsCO;
    return {
      found: false,
      sku,
      case_only: indentCaseOnly,
      case_only_reason: indentCaseOnly ? (isTarsonsCO ? 'TARSONS centrifuge tube — case pricing only, never show pack price' : 'DispoZ indent item — case pricing only, never show pack price') : null
    };
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

  // CASE-ONLY ENFORCEMENT (DispoZ): If item is DispoZ (DZ02- prefix) AND stock is a whole number (not decimal),
  // the item is sold by the case ONLY — agent must NOT show pack pricing.
  // Exception: 2 specific transfer pipette SKUs always allow pack/box pricing.
  const TRANSFER_PIPETTE_EXCEPTIONS = ['dj01-la1n00310505', 'dj01-la2n00330505'];
  const skuLowerForFlag = (match['NAME'] || match['name'] || match['Name'] || sku).toString().toLowerCase().trim();
  const isDispoZ = skuLowerForFlag.startsWith('dz02-') || skuLowerForFlag.startsWith('dj01-');
  const isException = TRANSFER_PIPETTE_EXCEPTIONS.some(ex => skuLowerForFlag.includes(ex));
  const qtyNum = parseFloat(qty);
  const isWholeNumber = !isNaN(qtyNum) && Number.isInteger(qtyNum);
  const caseOnly = isDispoZ && isWholeNumber && !isException && qtyNum > 0;
  if (caseOnly) {
    console.log(`[STOCK] CASE-ONLY enforced for ${sku}: DispoZ + whole-number stock (${qty}) → agent MUST NOT show pack pricing`);
  }

  // CASE-ONLY ENFORCEMENT (TARSONS centrifuge tubes): These specific SKUs are ALWAYS case-only regardless of stock decimal.
  const TARSONS_CASE_ONLY_SKUS = ['t38-546021', 't38-546041', 't38-500031', 't38-500041'];
  const isTarsonsCaseOnly = TARSONS_CASE_ONLY_SKUS.some(c => skuLowerForFlag.includes(c));
  const finalCaseOnly = caseOnly || isTarsonsCaseOnly;
  if (isTarsonsCaseOnly && !caseOnly) {
    console.log(`[STOCK] CASE-ONLY enforced for ${sku}: TARSONS centrifuge tube hard rule → agent MUST NOT show pack pricing`);
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
    notes: match['DESCRIPTION 2'] || match['Description 2'] || '',
    case_only: finalCaseOnly,
    case_only_reason: finalCaseOnly ? (isTarsonsCaseOnly ? 'TARSONS centrifuge tube — case pricing only, never show pack price' : 'DispoZ + whole-number stock — case pricing only, never show pack price') : null
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

async function getPriceIncrease(brand) {
  const rows = await fetchSheet('MASTER_INDEX');
  const brandLC = brand.toLowerCase().replace(/[^a-z0-9]/g, '');

  // MASTER_INDEX columns: Tab Name | Brand | PL Year | Increase % | Currency | Notes
  // Match on either Tab Name OR Brand column for flexibility
  const matches = rows.filter(row => {
    const tabName = (row['Tab Name'] || row['tab_name'] || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    const brandCol = (row['Brand'] || row['brand'] || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      tabName === brandLC ||
      brandCol === brandLC ||
      tabName.includes(brandLC) ||
      brandCol.includes(brandLC) ||
      brandLC.includes(tabName) ||
      brandLC.includes(brandCol)
    );
  });

  if (matches.length === 0) {
    return {
      found: false,
      brand,
      error: `Brand "${brand}" not found in MASTER_INDEX. Available brands: ${[...new Set(rows.map(r => r['Brand'] || r['brand'] || '').filter(Boolean))].join(', ')}`
    };
  }

  // If multiple matches (e.g., 4 HIMEDIA_* tabs), prefer exact tab match;
  // otherwise return all so the agent can see context
  const exact = matches.find(row => {
    const tabName = (row['Tab Name'] || row['tab_name'] || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    return tabName === brandLC;
  });

  if (exact) {
    return {
      found: true,
      brand: exact['Brand'] || exact['brand'] || brand,
      tab_name: exact['Tab Name'] || exact['tab_name'] || '',
      pl_year: exact['PL Year'] || exact['pl_year'] || '',
      increase_pct: exact['Increase %'] || exact['increase_pct'] || exact['increase'] || '0%',
      currency: exact['Currency'] || exact['currency'] || '',
      notes: exact['Notes'] || exact['notes'] || ''
    };
  }

  // Multiple matches and no exact tab — return all
  return {
    found: true,
    brand,
    multiple_matches: true,
    rows: matches.map(row => ({
      tab_name: row['Tab Name'] || row['tab_name'] || '',
      brand: row['Brand'] || row['brand'] || '',
      pl_year: row['PL Year'] || row['pl_year'] || '',
      increase_pct: row['Increase %'] || row['increase_pct'] || row['increase'] || '0%',
      currency: row['Currency'] || row['currency'] || '',
      notes: row['Notes'] || row['notes'] || ''
    }))
  };
}

module.exports = {
  searchProducts,
  searchByBrand,
  checkStock,
  getNascoDealerTier,
  getLeadTime,
  getPriceIncrease,
  listSheets,
  fetchSheet,
  recommendRotor,
  fetchFcbiosProductUrl,
  parsePackStructure
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

// Fetch and parse an FC-BIOS eStore product page, extracting key fields (SKU, title, brand, packing).
// Uses Shopify's built-in .json product endpoint for reliable structured data.
// Used when a dealer sends a specific fcbios.com.my/products/... URL — the URL maps 1-to-1 to a specific SKU.
async function fetchFcbiosProductUrl(url) {
  // Validate URL is from fcbios.com.my/products/
  const urlMatch = url.match(/^https?:\/\/(?:www\.)?fcbios\.com\.my\/products\/([a-z0-9-]+)/i);
  if (!urlMatch) {
    return { error: 'URL is not a valid fcbios.com.my product URL. Expected format: https://www.fcbios.com.my/products/[slug]' };
  }

  const slug = urlMatch[1];
  // Strip query params/fragment and use Shopify's .json endpoint for structured data
  const jsonUrl = `https://www.fcbios.com.my/products/${slug}.json`;

  try {
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      // Fallback: try HTML endpoint and regex-parse (less reliable)
      return await fetchFcbiosProductUrlHtml(url, slug);
    }

    const data = await response.json();
    const product = data.product;
    if (!product) {
      return { error: 'Unexpected response format from eStore', url };
    }

    // Shopify products have variants — for FC-BIOS, each product typically has 1 variant with the SKU
    const variants = product.variants || [];
    const primaryVariant = variants[0] || {};

    // Extract SKU — prefer variant SKU (FC-BIOS convention), fallback to product-level if present
    const sku = primaryVariant.sku || null;

    // If there are multiple variants with different SKUs, flag this so the agent knows
    const hasMultipleVariants = variants.length > 1;
    const allVariantSkus = variants.map(v => v.sku).filter(Boolean);

    return {
      url,
      slug,
      sku,
      title: product.title || null,
      brand: product.vendor || null,
      packing: primaryVariant.title && primaryVariant.title !== 'Default Title' ? primaryVariant.title : null,
      list_price_estore: primaryVariant.price ? parseFloat(primaryVariant.price) : null,
      has_multiple_variants: hasMultipleVariants,
      all_variant_skus: hasMultipleVariants ? allVariantSkus : undefined,
      note: 'This is the SKU the dealer wants. Use this EXACT SKU in your quotation. Do NOT offer other variants unless the dealer explicitly asks. The list_price_estore is the eStore list price — still search the pricelist for the dealer price.'
    };
  } catch (err) {
    return { error: `Network or parsing error: ${err.message}`, url };
  }
}

// Fallback: parse the HTML version if .json endpoint is unavailable
async function fetchFcbiosProductUrlHtml(url, slug) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return { error: `Failed to fetch URL: HTTP ${response.status}`, url };
    }

    const html = await response.text();
    const skuMatch = html.match(/SKU:\s*([A-Z0-9][A-Z0-9-]{2,60})/i);
    const sku = skuMatch ? skuMatch[1].trim() : null;

    let title = null;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].replace(/\s*[–-]\s*FC-?BIOS.*$/i, '').trim();

    const packingMatch = html.match(/Packing:\s*([^<\n]+)/i);
    const packing = packingMatch ? packingMatch[1].trim().replace(/\s+/g, ' ') : null;

    if (!sku) {
      return { error: 'Could not extract SKU from page HTML.', url, title };
    }

    return {
      url,
      slug,
      sku,
      title,
      packing,
      source: 'html_fallback',
      note: 'This is the SKU the dealer wants. Use this EXACT SKU in your quotation. Do NOT offer other variants unless the dealer explicitly asks.'
    };
  } catch (err) {
    return { error: `HTML fallback failed: ${err.message}`, url };
  }
}
