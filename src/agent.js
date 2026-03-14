const Anthropic = require('@anthropic-ai/sdk');
const { getSystemPrompt } = require('./systemPrompt');
const { searchProducts, searchByBrand, checkStock, getNascoDealerTier, getLeadTime, listSheets } = require('./googleSheets');

const client = new Anthropic();

const tools = [
  {
    name: 'search_products',
    description: 'Search across ALL brand pricelist tabs for products matching a keyword. Use for general product searches when brand is unknown.',
    input_schema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Search keyword (product name, SKU, description)' }
      },
      required: ['keyword']
    }
  },
  {
    name: 'search_brand',
    description: 'Search within a specific brand tab for products. Use when you know which brand to search (e.g., from brand priority rules).',
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
      case 'search_products':
        result = await searchProducts(toolInput.keyword);
        break;
      case 'search_brand':
        result = await searchByBrand(toolInput.brand_tab, toolInput.keyword);
        break;
      case 'check_stock':
        result = await checkStock(toolInput.sku);
        break;
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

  const userMessage = `New dealer email received:

FROM: ${emailData.from_name} <${emailData.from_email}>
SUBJECT: ${emailData.subject}

EMAIL BODY:
${emailData.body}

---
Process this email according to your instructions. Search the pricelists, check stock, apply pricing rules, and draft the appropriate response.`;

  let messages = [{ role: 'user', content: userMessage }];
  let draftResult = null;

  for (let i = 0; i < 15; i++) {
    console.log(`[AGENT] Loop ${i + 1}/15`);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools,
      messages: messages
    });

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
