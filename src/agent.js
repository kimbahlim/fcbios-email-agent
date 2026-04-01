const Anthropic = require('@anthropic-ai/sdk');
const { getSystemPrompt } = require('./systemPrompt');
const { searchProducts, searchByBrand, checkStock, getNascoDealerTier, getLeadTime, listSheets } = require('./googleSheets');

const client = new Anthropic();

const tools = [
  {
    name: 'search_brand',
    description: 'Search within a specific brand tab for products. ALWAYS use this tool — refer to the BRAND-PRODUCT MAPPING in your instructions to determine which brand tab to search. Available tabs include: NASCO, LOGTAG, MINMAX, HIMEDIA_Microbiology, HIMEDIA_Molecular_Biology, HIMEDIA_Animal_Tissue_Culture, HIMEDIA_RPM_Plates, MEIZHENG, TARSONS, UGAIYA, ANQING_YIPAK, SORFA, IUL, MVE, PROGNOSIS, NEOGEN, GYROZEN, TOMY, DISPOZ, LP, MEMBRANE_SOLUTIONS, MESALABS. For Gyrozen centrifuge rotor compatibility, also search: "GYROZEN - ROTOR SELECTION GUIDE".',
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
        dealer_name: { type: 'string', description: 'Dealer contact name' },
        subject: { type: 'string', description: 'Email subject line' },
        html_body: { type: 'string', description: 'Full HTML email body with quotation table, notes, and signature' }
      },
      required: ['type', 'reply_to', 'dealer_name', 'subject', 'html_body']
    }
  }
];

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

  for (let i = 0; i < 20; i++) {
    console.log(`[AGENT] Loop ${i + 1}/20`);

    let response;
    try {
      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
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

    if (response.stop_reason === 'end_turn') {
      console.log('[AGENT] Done (end_turn)');
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        const result = await processToolCall(toolUse.name, toolUse.input);

        if (toolUse.name === 'draft_email') {
          draftResult = {
            type: toolUse.input.type,
            reply_to: toolUse.input.reply_to,
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
