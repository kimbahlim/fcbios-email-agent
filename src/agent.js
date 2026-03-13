const Anthropic = require('@anthropic-ai/sdk');
const getSystemPrompt = require('./systemPrompt');
const {
  searchProducts,
  searchBrand,
  checkStock,
  getLeadTime,
  getNascoDealerTier,
  checkNotForExport,
  listSheets
} = require('./googleSheets');

const client = new Anthropic();

const tools = [
  {
    name: 'search_products',
    description: 'Search across ALL brand pricelist tabs for products matching a keyword. Returns up to 20 results from any brand. Use for general product searches when unsure which brand.',
    input_schema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Search keyword(s). E.g., "petri dish 90mm", "centrifuge tube 50ml"' }
      },
      required: ['keyword']
    }
  },
  {
    name: 'search_brand',
    description: 'Search within a SPECIFIC brand pricelist tab. Use when you know which brand from the Brand-Product Mapping.',
    input_schema: {
      type: 'object',
      properties: {
        brand_tab: { type: 'string', description: 'Exact tab name. E.g., "HIMEDIA_Microbiology", "TARSONS", "LOGTAG", "DISPOZ", "LP", "NASCO", "UGAIYA", "MESALABS", "PROGNOSIS", "NEOGEN", "SORFA", "MINMAX", "MVE", "GYROZEN", "TOMY", "MEIZHENG", "MEMBRANE_SOLUTIONS", "IUL", "ANQING_YIPAK", "HIMEDIA_Molecular_Biology", "HIMEDIA_Animal_Tissue_Culture", "HIMEDIA_RPM_Plates"' },
        keyword: { type: 'string', description: 'Search keyword(s) within that brand tab' }
      },
      required: ['brand_tab', 'keyword']
    }
  },
  {
    name: 'check_stock',
    description: 'Check stock availability for a specific SKU. MUST be called for every item you quote.',
    input_schema: {
      type: 'object',
      properties: {
        sku: { type: 'string', description: 'SKU/item code. E.g., "MH290-500G", "L21-UTRIX-16"' }
      },
      required: ['sku']
    }
  },
  {
    name: 'get_lead_time',
    description: 'Get lead time for non-stocking/indent items of a brand from LEAD_TIMES tab.',
    input_schema: {
      type: 'object',
      properties: {
        brand: { type: 'string', description: 'Brand name. E.g., "HiMedia", "TARSONS", "LogTag"' }
      },
      required: ['brand']
    }
  },
  {
    name: 'get_nasco_dealer_tier',
    description: 'Look up a dealer NASCO pricing tier from Nasco_Tiers tab.',
    input_schema: {
      type: 'object',
      properties: {
        dealer_name: { type: 'string', description: 'Dealer company name' }
      },
      required: ['dealer_name']
    }
  },
  {
    name: 'check_not_for_export',
    description: 'Check if a HiMedia product code is on the Not For Export list.',
    input_schema: {
      type: 'object',
      properties: {
        product_code: { type: 'string', description: 'HiMedia product code. E.g., "M091-500G"' }
      },
      required: ['product_code']
    }
  },
  {
    name: 'list_brands',
    description: 'List all available pricelist tab names.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'draft_email',
    description: 'Finalize the quotation email. Call when you have all info. Email MUST be HTML with proper tables.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['quotation', 'pre_quote', 'escalation'], description: 'Email type' },
        reply_to: { type: 'string', description: 'The ACTUAL dealer email to reply to. For forwarded emails, this is the original dealer email extracted from the forwarded content. For direct emails, use the from_email.' },
        dealer_name: { type: 'string', description: 'The ACTUAL dealer name to address in the email.' },
        subject: { type: 'string', description: 'Email subject line' },
        html_body: { type: 'string', description: 'Complete HTML email body' },
        agent_notes: { type: 'string', description: 'Internal notes for human reviewer (not sent to dealer)' }
      },
      required: ['type', 'reply_to', 'dealer_name', 'subject', 'html_body']
    }
  }
];

async function processToolCall(toolName, toolInput) {
  switch (toolName) {
    case 'search_products': return await searchProducts(toolInput.keyword);
    case 'search_brand': return await searchBrand(toolInput.brand_tab, toolInput.keyword);
    case 'check_stock': return await checkStock(toolInput.sku);
    case 'get_lead_time': return await getLeadTime(toolInput.brand);
    case 'get_nasco_dealer_tier': return await getNascoDealerTier(toolInput.dealer_name);
    case 'check_not_for_export': return await checkNotForExport(toolInput.product_code);
    case 'list_brands': return await listSheets();
    case 'draft_email': return { success: true, ...toolInput };
    default: return { error: `Unknown tool: ${toolName}` };
  }
}

async function runAgent({ from_name, from_email, subject, body }) {
  const systemPrompt = getSystemPrompt();

  const userMessage = `New dealer enquiry email:

FROM: ${from_name} <${from_email}>
SUBJECT: ${subject}
BODY:
${body}

---
Process this enquiry following your system prompt rules. Search pricelists, check stock for every item, apply correct pricing, and draft a professional HTML quotation email. Call draft_email when done.`;

  const messages = [{ role: 'user', content: userMessage }];
  let loopCount = 0;
  const MAX_LOOPS = 15;

  while (loopCount < MAX_LOOPS) {
    loopCount++;
    console.log(`[AGENT] Loop ${loopCount}/${MAX_LOOPS}`);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      tools,
      messages
    });

    console.log(`[AGENT] Stop reason: ${response.stop_reason}`);

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      return {
        type: 'escalation',
        subject: `Re: ${subject}`,
        htmlBody: textBlock ? `<p>${textBlock.text}</p>` : '<p>Unable to process. Please review manually.</p>',
        agentNotes: 'Agent ended without draft_email'
      };
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        console.log(`[TOOL] ${block.name}: ${JSON.stringify(block.input).substring(0, 150)}`);

        if (block.name === 'draft_email') {
          return {
            type: block.input.type,
            replyTo: block.input.reply_to,
            dealerName: block.input.dealer_name,
            subject: block.input.subject,
            htmlBody: block.input.html_body,
            agentNotes: block.input.agent_notes || ''
          };
        }

        const result = await processToolCall(block.name, block.input);
        console.log(`[TOOL] ${block.name} → ${JSON.stringify(result).substring(0, 200)}`);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result)
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }
  }

  return {
    type: 'escalation',
    subject: `Re: ${subject}`,
    htmlBody: `<p>Dear ${from_name},</p><p>Thank you for your enquiry. We are processing your request and will get back to you shortly.</p><p>Best regards,<br>Dealer Support Channel<br>FC Bios Sdn Bhd<br>WhatsApp Hotline: 019-2663675</p>`,
    agentNotes: `Max loops (${MAX_LOOPS}) reached. Manual review needed.`
  };
}

module.exports = { runAgent };
