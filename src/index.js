const express = require('express');
const { runAgent } = require('./agent');
const { createGmailDraft } = require('./gmail');

const app = express();
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Zapier webhook endpoint
app.post('/webhook/new-email', async (req, res) => {
  // Validate webhook secret
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    console.log('[WEBHOOK] Invalid secret');
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  const { from_name, from_email, subject, body, message_id, thread_id } = req.body;

  if (!body || !from_email) {
    return res.status(400).json({ error: 'Missing required fields: body, from_email' });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[NEW EMAIL] From: ${from_name} <${from_email}>`);
  console.log(`[SUBJECT] ${subject}`);
  console.log(`[BODY] ${body.substring(0, 200)}...`);

  // Respond to Zapier immediately (agent processes in background)
  res.json({ status: 'processing', message_id });

  try {
    // Run the agent (in background)
    const agentResult = await runAgent({
      from_name: from_name || 'Customer',
      from_email,
      subject: subject || 'Enquiry',
      body
    });

    console.log(`[AGENT] Done. Type: ${agentResult.type}`);

    // Use agent's reply_to (handles forwarded emails) or fall back to from_email
    const replyToEmail = agentResult.replyTo || from_email;
    const dealerName = agentResult.dealerName || from_name;

    console.log(`[REPLY TO] ${dealerName} <${replyToEmail}>`);

    // Add agent notes as yellow banner if present
    let finalHtml = agentResult.htmlBody;
    if (agentResult.agentNotes) {
      finalHtml = `<div style="background:#fff3cd;border:1px solid #ffc107;padding:12px;margin-bottom:16px;border-radius:6px;font-family:Arial,sans-serif;font-size:13px;color:#856404;">⚠️ ${agentResult.agentNotes}</div>\n${finalHtml}`;
    }

    // Create Gmail draft
    const draft = await createGmailDraft({
      to: replyToEmail,
      subject: agentResult.subject || `Re: ${subject}`,
      htmlBody: finalHtml,
      threadId: thread_id,
      messageId: message_id
    });

    console.log(`[GMAIL] Draft created: ${draft.id}`);
    res.json({ success: true, draftId: draft.id, type: agentResult.type });

  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Cache clear endpoint (for stock sync)
app.post('/webhook/stock-updated', (req, res) => {
  const { clearCache } = require('./googleSheets');
  clearCache();
  console.log('[STOCK] Cache cleared after stock update');
  res.json({ success: true, message: 'Cache cleared' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FC-BIOS Email Agent running on port ${PORT}`);
  console.log(`Webhook: POST /webhook/new-email`);
  console.log(`Health: GET /health`);
});
