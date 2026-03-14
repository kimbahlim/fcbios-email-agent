const express = require('express');
const { runAgent } = require('./agent');
const { createGmailDraft } = require('./gmail');

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  console.log('Health: GET /health');
  res.json({ status: 'ok' });
});

// Webhook endpoint
app.post('/webhook/new-email', async (req, res) => {
  console.log('Webhook: POST /webhook/new-email');

  // Validate webhook secret
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    console.log('[ERROR] Invalid webhook secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { from_name, from_email, subject, body, message_id, thread_id } = req.body;

  console.log(`[SUBJECT] ${subject}`);
  console.log('============================================================');
  console.log(`[NEW EMAIL] From: ${from_name} <${from_email}>`);
  console.log(`[BODY] ${(body || '').substring(0, 200)}...`);

  // Respond immediately - process in background
  res.json({ status: 'processing', message: 'Email received, agent is working' });

  // Background processing
  try {
    const result = await runAgent({
      from_name: from_name || '',
      from_email: from_email || '',
      subject: subject || '',
      body: body || '',
      message_id: message_id || '',
      thread_id: thread_id || ''
    });

    if (result && result.draft_html) {
      const replyTo = result.reply_to || from_email;
      const replyName = result.dealer_name || from_name;
      const draftSubject = result.subject || `Re: ${subject}`;

      console.log(`[REPLY TO] ${replyName} <${replyTo}>`);

      const draftResult = await createGmailDraft({
        to: `${replyName} <${replyTo}>`,
        subject: draftSubject,
        htmlBody: result.draft_html,
        messageId: message_id,
        threadId: thread_id
      });

      console.log(`[GMAIL] Draft created: ${draftResult.id}`);
    } else {
      console.log('[AGENT] No draft generated');
    }
  } catch (error) {
    console.error('[ERROR]', error.message);
    console.error(error.stack);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FC-BIOS Email Agent running on port ${PORT}`);
});
