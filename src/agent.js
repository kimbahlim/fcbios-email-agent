const Anthropic = require('@anthropic-ai/sdk');
const { getSystemPrompt } = require('./systemPrompt');
const { searchProducts, searchByBrand, checkStock, getNascoDealerTier, getLeadTime, listSheets, fetchSheet, recommendRotor, fetchFcbiosProductUrl } = require('./googleSheets');
const { getBrandInstructions } = require('./brandInstructions');

const client = new Anthropic();

const tools = [
  {
    name: 'search_brand',
    description: 'Search within a specific brand tab for products. ALWAYS use this tool — refer to the BRAND-PRODUCT MAPPING in your instructions to determine which brand tab to search. Available tabs include: NASCO, LOGTAG, MINMAX, HIMEDIA_Microbiology, HIMEDIA_Molecular_Biology, HIMEDIA_Animal_Tissue_Culture, HIMEDIA_RPM_Plates, MEIZHENG, TARSONS, UGAIYA, ANQING_YIPAK, SORFA, IUL, MVE, PROGNOSIS, NEOGEN, GYROZEN, TOMY, DISPOZ, LP, MEMBRANE_SOLUTIONS, MESALABS, GOSSELIN. For Gyrozen centrifuge rotor compatibility, also search: "GYROZEN - ROTOR SELECTION GUIDE".',
    input_schema: {
      type: 'object',
      properties: {
        brand_tab: { type: 'string', description: 'Brand tab name (e.g., NASCO, LOGTAG, HIMEDIA_Microbiology, TARSONS, DISPOZ, etc.)' },
        keyword: { type: 'string', description: 'Search keyword' }
      },
      required: ['brand_tab', 'keyword']
    }
  },
  {
    name: 'search_brand_batch',
    description: 'Search for MULTIPLE products in one or more brand tabs in a single call. Use this instead of calling search_brand multiple times. MUCH more efficient for multi-item enquiries.',
    input_schema: {
      type: 'object',
      properties: {
        searches: {
          type: 'array',
          description: 'Array of search requests, each with brand_tab and keyword',
          items: {
            type: 'object',
            properties: {
              brand_tab: { type: 'string', description: 'Brand tab name' },
              keyword: { type: 'string', description: 'Search keyword' }
            },
            required: ['brand_tab', 'keyword']
          }
        }
      },
      required: ['searches']
    }
  },
  {
    name: 'check_stock',
    description: 'Check stock availability for a specific SKU from the Stock tab.',
    input_schema: {
      type: 'object',
      properties: {
        sku: { type: 'string', description: 'Product SKU to check stock for' }
      },
      required: ['sku']
    }
  },
  {
    name: 'check_stock_batch',
    description: 'Check stock for MULTIPLE SKUs in a single call. Use this instead of calling check_stock multiple times. Returns stock data for all requested SKUs at once.',
    input_schema: {
      type: 'object',
      properties: {
        skus: {
          type: 'array',
          description: 'Array of SKU strings to check stock for',
          items: { type: 'string' }
        }
      },
      required: ['skus']
    }
  },
  {
    name: 'get_nasco_dealer_tier',
    description: 'Look up a dealer\'s NASCO pricing tier based on their sales history.',
    input_schema: {
      type: 'object',
      properties: {
        dealer_name: { type: 'string', description: 'Dealer company name' }
      },
      required: ['dealer_name']
    }
  },
  {
    name: 'get_lead_time',
    description: 'Get the lead time for a brand\'s non-stocking items from the LEAD_TIMES tab.',
    input_schema: {
      type: 'object',
      properties: {
        brand: { type: 'string', description: 'Brand name' }
      },
      required: ['brand']
    }
  },
  {
    name: 'list_brands',
    description: 'List all available brand pricelist tabs in the spreadsheet.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'draft_email',
    description: 'Draft the final quotation email to send to the dealer. Call this when you have all the information needed.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['quotation', 'pre_quote', 'escalation', 'forward', 'lead_time'], description: 'Type of email' },
        reply_to: { type: 'string', description: 'Dealer email address to reply to (use original dealer email for forwarded emails)' },
        cc: { type: 'string', description: 'CC email address (optional). Use for PO requotes with invalid pricing — CC ezza@fcbios.com.my' },
        dealer_name: { type: 'string', description: 'Dealer contact name' },
        subject: { type: 'string', description: 'Email subject line' },
        html_body: { type: 'string', description: 'Full HTML email body with quotation table, notes, and signature' }
      },
      required: ['type', 'reply_to', 'dealer_name', 'subject', 'html_body']
    }
  },
  {
    name: 'get_brand_instructions',
    description: 'Get detailed quoting instructions for equipment/specialty brands: TOMY (autoclave MOB fees, JKKP rules, accessories), GYROZEN (centrifuge model range, rotor selection, delivery/TnC charges), MVE (dewar bundling rules, research dewar lid pairings, product links), IUL (air sampler/masticator/colony counter rules). Call this BEFORE quoting these brands.',
    input_schema: {
      type: 'object',
      properties: {
        brand: { type: 'string', description: 'Brand name: TOMY, GYROZEN, MVE, or IUL' }
      },
      required: ['brand']
    }
  },
  {
    name: 'recommend_rotor',
    description: 'Recommend the best Gyrozen centrifuge rotor, bucket, and adaptor configuration based on the dealer\'s requirements. Returns scored recommendations from the GYROZEN ROTOR SELECTION GUIDE with calculated total tube capacity. ALWAYS use this tool for Gyrozen centrifuge quotes instead of manually interpreting the rotor guide.',
    input_schema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Centrifuge model (e.g., "416", "1580R", "1696R", "624R")' },
        tube_type: { type: 'string', description: 'Tube type (e.g., "15mL conical", "50mL conical", "vacuum tube", "microplate", "blood tube", "swing-out")' },
        tube_size: { type: 'string', description: 'Tube size (e.g., "15mL", "50mL", "2.0mL", "100mL")' },
        quantity: { type: 'integer', description: 'Number of tubes the dealer needs to spin per run' }
      },
      required: ['model']
    }
  },
  {
    name: 'fetch_fcbios_product_url',
    description: 'Fetch the exact SKU from an FC-BIOS eStore product URL. ALWAYS call this FIRST when the dealer email contains a URL matching "fcbios.com.my/products/...". Each eStore product URL maps 1-to-1 to one specific SKU — this tool returns that exact SKU so you do not have to guess. After getting the SKU, use search_brand to find its pricelist row, then check_stock. Quote ONLY the returned SKU — do NOT offer other variants or similar products unless the dealer explicitly asks for alternatives.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The full fcbios.com.my/products/... URL from the dealer email (can include query parameters like ?srsltid=...)' }
      },
      required: ['url']
    }
  }
];

/**
 * Validate the agent's draft HTML against the set of SKUs that are case-only.
 * For each case-only SKU found in the draft's quote table, check that the row's
 * Pack Packing and Pack Price columns are blank/empty.
 *
 * Returns an array of violation messages. Empty array = no violations.
 *
 * Pricelist quote tables follow this column order (after Brand):
 *   Brand | SKU | Description | Pack Packing | Pack Price | Case Packing | Case Price | Stock Status
 *
 * So in a row containing a case-only SKU, columns 4 and 5 (Pack Packing, Pack Price)
 * MUST be empty / dash / non-numeric. If they contain numeric pricing data, that's a
 * violation.
 */
function validateDraftHtml(html, caseOnlySkus) {
  if (!html || caseOnlySkus.size === 0) return [];
  const violations = [];

  // Extract all <tr>...</tr> blocks
  const trMatches = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const tr of trMatches) {
    // Extract cell contents — strip HTML tags inside each cell
    const cellMatches = tr.match(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi) || [];
    if (cellMatches.length < 6) continue; // Not enough cells to be a quote row

    const cells = cellMatches.map(c => {
      // Strip inner HTML tags, normalize whitespace, decode common entities
      return c
        .replace(/<(?:td|th)\b[^>]*>/i, '')
        .replace(/<\/(?:td|th)>$/i, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
    });

    // Standard column order: [Brand, SKU, Description, Pack Packing, Pack Price, Case Packing, Case Price, Stock Status]
    // SKU is typically in column index 1; Pack Packing in 3; Pack Price in 4.
    // Scan all cells for a case-only SKU to be robust to minor column shifts.
    let skuMatchIdx = -1;
    let matchedSku = null;
    for (let idx = 0; idx < cells.length; idx++) {
      const cellLower = cells[idx].toLowerCase();
      for (const co of caseOnlySkus) {
        if (cellLower === co || cellLower.includes(co)) {
          skuMatchIdx = idx;
          matchedSku = co;
          break;
        }
      }
      if (matchedSku) break;
    }

    if (!matchedSku) continue;

    // Pack columns are 2 and 3 cells AFTER the SKU cell (Description sits in between).
    const packPackingIdx = skuMatchIdx + 2;
    const packPriceIdx = skuMatchIdx + 3;

    const isBlank = (v) => {
      if (v === undefined || v === null) return true;
      const t = v.toString().trim();
      if (t === '' || t === '-' || t === '–' || t === '—' || t === 'N/A' || t === 'n/a' || t === '–') return true;
      return false;
    };
    const containsNumeric = (v) => /\d/.test(v || '');

    const packPackingVal = cells[packPackingIdx] || '';
    const packPriceVal = cells[packPriceIdx] || '';

    if (!isBlank(packPackingVal) && containsNumeric(packPackingVal)) {
      violations.push(`SKU ${matchedSku.toUpperCase()}: Pack Packing column contains "${packPackingVal}" — must be BLANK (case-only item, no pack pricing in pricelist).`);
    }
    if (!isBlank(packPriceVal) && containsNumeric(packPriceVal)) {
      violations.push(`SKU ${matchedSku.toUpperCase()}: Pack Price column contains "${packPriceVal}" — must be BLANK (case-only item, no pack pricing in pricelist). Do NOT fabricate pack price by dividing case price. Quote case price only.`);
    }
  }

  return violations;
}

async function processToolCall(toolName, toolInput) {
  console.log(`[TOOL] ${toolName}: ${JSON.stringify(toolInput).substring(0, 100)}`);

  try {
    let result;
    switch (toolName) {
      case 'search_brand':
        result = await searchByBrand(toolInput.brand_tab, toolInput.keyword);
        break;
      case 'search_brand_batch': {
        const batchResults = {};
        let searches = toolInput.searches;
        // Safety: if agent sent searches as a JSON string instead of array, parse it
        if (typeof searches === 'string') {
          try { searches = JSON.parse(searches); } catch (e) {
            console.log('[BATCH SEARCH] Failed to parse searches string:', e.message);
            result = { error: 'Invalid searches format' };
            break;
          }
        }
        for (const search of searches) {
          const key = `${search.brand_tab}:${search.keyword}`;
          console.log(`[BATCH SEARCH] ${search.brand_tab} → "${search.keyword}"`);
          batchResults[key] = await searchByBrand(search.brand_tab, search.keyword);
        }
        result = batchResults;
        break;
      }
      case 'check_stock':
        result = await checkStock(toolInput.sku);
        
        // NASCO AUTO-ALTERNATIVE: If a NASCO item is not in stock, find ex-stock alternatives
        if (toolInput.sku.toLowerCase().startsWith('n02-') && (!result.found || parseFloat(result.qty || '0') === 0)) {
          try {
            console.log(`[NASCO ALT] ${toolInput.sku} not ex-stock — searching for ex-stock alternatives`);
            // Get ALL NASCO products from pricelist (not limited to 20 like searchByBrand)
            const nascoRows = await fetchSheet('NASCO');
            const stockTab = await fetchSheet('Stock');
            const exStockAlts = [];
            
            for (const row of nascoRows) {
              const itemCode = row['NetSuite Item Code'] || row['NetSuite Code'] || '';
              const stockingStatus = (row['Stocking Status'] || '').toUpperCase();
              if (!itemCode || itemCode === toolInput.sku) continue;
              if (stockingStatus !== 'S') continue; // Only consider stocking items
              
              // Check if this item is in stock
              // NASCO: strip WA suffix for stock matching
              const itemCodeLower = itemCode.toLowerCase();
              const itemCodeNoWA = itemCodeLower.endsWith('wa') ? itemCodeLower.slice(0, -2) : itemCodeLower;
              
              const stockMatch = stockTab.find(s => {
                const name = (s['NAME'] || s['name'] || Object.values(s)[0] || '').toLowerCase();
                return name.includes(itemCodeLower) || name.includes(itemCodeNoWA) || itemCodeLower.includes(name) || itemCodeNoWA.includes(name);
              });
              
              if (stockMatch) {
                const qty = stockMatch['AVAILABLE'] || stockMatch['Available'] || stockMatch['QTY AVAILABLE'] || '0';
                if (parseFloat(qty) > 0) {
                  exStockAlts.push({
                    sku: itemCode,
                    description: row['Description'] || '',
                    qty_available: qty,
                    uom: stockMatch['PRIMARY STOCK UNIT'] || stockMatch['UOM'] || 'unit',
                    price_tier1: row['Tier1 <RM10K'] || '',
                  });
                }
              }
            }
            
            if (exStockAlts.length > 0) {
              console.log(`[NASCO ALT] Found ${exStockAlts.length} ex-stock alternatives`);
              result.ex_stock_alternatives = exStockAlts.slice(0, 8); // limit to 8 options
              result.note = 'This item is indent. Ex-stock alternatives in similar sizes are listed in ex_stock_alternatives. Offer the closest size match to the dealer.';
            }
          } catch (e) {
            console.log(`[NASCO ALT] Error searching alternatives: ${e.message}`);
          }
        }
        
        break;
      case 'check_stock_batch': {
        const stockResults = {};
        let skus = toolInput.skus;
        if (typeof skus === 'string') {
          try { skus = JSON.parse(skus); } catch (e) {
            console.log('[BATCH STOCK] Failed to parse skus string:', e.message);
            result = { error: 'Invalid skus format' };
            break;
          }
        }
        for (const sku of skus) {
          console.log(`[BATCH STOCK] Checking: ${sku}`);
          stockResults[sku] = await checkStock(sku);
        }
        result = stockResults;
        break;
      }
      case 'get_nasco_dealer_tier':
        result = await getNascoDealerTier(toolInput.dealer_name);
        break;
      case 'get_lead_time':
        result = await getLeadTime(toolInput.brand);
        break;
      case 'list_brands':
        result = await listSheets();
        break;
      case 'get_brand_instructions':
        result = getBrandInstructions(toolInput.brand);
        console.log(`[BRAND_INSTRUCTIONS] Loaded instructions for "${toolInput.brand}" (${result.length} chars)`);
        break;
      case 'recommend_rotor':
        result = await recommendRotor(toolInput.model, toolInput.tube_type, toolInput.tube_size, toolInput.quantity);
        console.log(`[ROTOR] Recommendations for ${toolInput.model}: ${JSON.stringify(result).substring(0, 200)}`);
        break;
      case 'fetch_fcbios_product_url':
        result = await fetchFcbiosProductUrl(toolInput.url);
        console.log(`[FCBIOS_URL] ${toolInput.url} → SKU: ${result.sku || 'ERROR: ' + result.error}`);
        break;
      case 'draft_email':
        result = { success: true, type: toolInput.type };
        break;
      default:
        result = { error: `Unknown tool: ${toolName}` };
    }

    const resultStr = JSON.stringify(result).substring(0, 300);
    console.log(`[TOOL] ${toolName} → ${resultStr}`);
    return result;
  } catch (error) {
    console.error(`[ERROR] ${toolName}: ${error.message}`);
    return { error: error.message };
  }
}

async function runAgent(emailData) {
  const systemPrompt = getSystemPrompt();

  const textContent = `New dealer email received:

FROM: ${emailData.from_name} <${emailData.from_email}>
SUBJECT: ${emailData.subject}

EMAIL BODY:
${emailData.body}

---
Process this email according to your instructions. Search the pricelists, check stock, apply pricing rules, and draft the appropriate response.${emailData.visionContent && emailData.visionContent.length > 0 ? '\n\nThe email includes image/PDF attachments shown below. Extract any product requests, SKUs, quantities, or relevant information from the attachments and include them in your quotation.' : ''}`;

  // Build user message content - text first, then any vision attachments
  let userContent;
  if (emailData.visionContent && emailData.visionContent.length > 0) {
    userContent = [
      { type: 'text', text: textContent },
      ...emailData.visionContent
    ];
    console.log(`[AGENT] Processing email with ${emailData.visionContent.length} attachment(s)`);
  } else {
    userContent = textContent;
  }

  let messages = [{ role: 'user', content: userContent }];
  let draftResult = null;

  // SANITY CHECK: Track SKUs that must be case-only (cannot have pack pricing)
  // Populated from search_brand / search_brand_batch / check_stock results where:
  //   _has_pack_pricing === false   (pricelist row has no pack columns)
  //   case_only === true            (stock check determined case-only enforcement)
  const caseOnlySkus = new Set();
  // Track how many regenerations have been requested (to avoid infinite loop)
  let regenerationAttempts = 0;
  const MAX_REGENERATIONS = 2;

  for (let i = 0; i < 20; i++) {
    console.log(`[AGENT] Loop ${i + 1}/20`);

    let response;
    try {
      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }
          }
        ],
        tools: [
          ...tools,
          {
            type: 'web_search_20250305',
            name: 'web_search'
          }
        ],
        messages: messages
      });
    } catch (apiError) {
      const errMsg = apiError.message || String(apiError);
      console.log(`[AGENT ERROR] ${apiError.status || 'unknown'} ${errMsg}`);
      
      // If image too large, retry without images
      if (errMsg.includes('image exceeds') || errMsg.includes('5 MB maximum')) {
        console.log('[AGENT] Retrying without images (too large for API)...');
        messages = messages.map(m => ({
          ...m,
          content: Array.isArray(m.content) 
            ? m.content.filter(c => c.type !== 'image')
            : m.content
        }));
        continue; // retry the loop without images
      }
      
      // For other API errors, throw to be handled upstream
      throw apiError;
    }

    console.log(`[AGENT] Stop reason: ${response.stop_reason}`);

    // Log token usage including cache stats — verifies prompt caching is working
    if (response.usage) {
      const u = response.usage;
      const cacheRead = u.cache_read_input_tokens || 0;
      const cacheWrite = u.cache_creation_input_tokens || 0;
      const input = u.input_tokens || 0;
      const output = u.output_tokens || 0;
      const cacheStatus = cacheRead > 0 ? '✓ HIT' : (cacheWrite > 0 ? '✗ MISS (writing)' : '— no cache');
      console.log(`[AGENT] Tokens: input=${input}, cache_read=${cacheRead}, cache_write=${cacheWrite}, output=${output} [${cacheStatus}]`);
    }

    if (response.stop_reason === 'max_tokens') {
      console.log('[AGENT WARNING] ⚠️  Response was truncated — output exceeded max_tokens (16384). Draft may be incomplete or missing.');
    }

    if (response.stop_reason === 'end_turn') {
      console.log('[AGENT] Done (end_turn)');
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        const result = await processToolCall(toolUse.name, toolUse.input);

        // SANITY CHECK TRACKING: extract case-only SKUs from search and stock results
        try {
          // search_brand returns array of row objects
          if (toolUse.name === 'search_brand' && Array.isArray(result)) {
            for (const row of result) {
              if (row && row._has_pack_pricing === false) {
                const sku = row['NetSuite Item Code'] || row['NetSuite Code'] || row.sku;
                if (sku) caseOnlySkus.add(String(sku).toLowerCase());
              }
            }
          }
          // search_brand_batch returns { "tab:keyword": [rows], ... }
          if (toolUse.name === 'search_brand_batch' && result && typeof result === 'object') {
            for (const groupKey of Object.keys(result)) {
              const rows = result[groupKey];
              if (!Array.isArray(rows)) continue;
              for (const row of rows) {
                if (row && row._has_pack_pricing === false) {
                  const sku = row['NetSuite Item Code'] || row['NetSuite Code'] || row.sku;
                  if (sku) caseOnlySkus.add(String(sku).toLowerCase());
                }
              }
            }
          }
          // check_stock returns single object with case_only flag
          if (toolUse.name === 'check_stock' && result && result.case_only === true) {
            const sku = result.sku || toolUse.input.sku;
            if (sku) caseOnlySkus.add(String(sku).toLowerCase());
          }
          // check_stock_batch (if it returns a dict of sku -> stock result)
          if (toolUse.name === 'check_stock_batch' && result && typeof result === 'object') {
            for (const sku of Object.keys(result)) {
              const stockResult = result[sku];
              if (stockResult && stockResult.case_only === true) {
                caseOnlySkus.add(String(sku).toLowerCase());
              }
            }
          }
        } catch (e) {
          console.log(`[SANITY] Tracking error (non-fatal): ${e.message}`);
        }

        if (toolUse.name === 'draft_email') {
          // SANITY CHECK: validate the draft HTML against caseOnlySkus before accepting
          const html = toolUse.input.html_body || '';
          const violations = validateDraftHtml(html, caseOnlySkus);

          if (violations.length > 0 && regenerationAttempts < MAX_REGENERATIONS) {
            regenerationAttempts++;
            console.log(`[SANITY] ❌ Draft validation FAILED (attempt ${regenerationAttempts}/${MAX_REGENERATIONS}): ${violations.length} violation(s)`);
            for (const v of violations) {
              console.log(`[SANITY]   - ${v}`);
            }
            // Return an error tool result that forces the agent to regenerate without breaking the loop
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({
                error: 'DRAFT_VALIDATION_FAILED',
                error_summary: 'Your quote table contains pack pricing for SKUs that are case-only. You MUST regenerate the draft with the violations below corrected. NEVER fabricate pack pricing — quote ONLY the case packing and case price for these SKUs, and leave the Pack Packing and Pack Price columns BLANK.',
                violations: violations,
                action_required: 'Call draft_email AGAIN with corrected html_body. The corrected version must: (1) leave Pack Packing column BLANK for each listed SKU, (2) leave Pack Price column BLANK for each listed SKU, (3) keep Case Packing and Case Price as quoted. Do not change any other content.'
              }),
              is_error: true
            });
            // Do NOT set draftResult — let the loop continue so the agent can regenerate
            continue;
          }

          // Either no violations, or we've exhausted regeneration attempts
          if (violations.length > 0) {
            console.log(`[SANITY] ⚠️  Max regenerations reached (${MAX_REGENERATIONS}); accepting draft with ${violations.length} unresolved violation(s) — operator review recommended`);
          } else {
            console.log(`[SANITY] ✓ Draft passed validation (${caseOnlySkus.size} case-only SKUs tracked)`);
          }

          draftResult = {
            type: toolUse.input.type,
            reply_to: toolUse.input.reply_to,
            cc: toolUse.input.cc || null,
            dealer_name: toolUse.input.dealer_name,
            subject: toolUse.input.subject,
            draft_html: toolUse.input.html_body
          };
          console.log(`[AGENT] Done. Type: ${draftResult.type}`);
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      if (draftResult) break;
    } else {
      break;
    }
  }

  return draftResult;
}

module.exports = { runAgent };
