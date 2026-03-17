const express = require('express');
const { runAgent } = require('./agent');
const {
  getAgentLabelId,
  getAgentLabeledMessages,
  getFullMessage,
  getThreadMessages,
  parseMessage,
  processAttachments,
  createGmailDraft
} = require('./gmail');

const app = express();
app.use(express.json());

// ============================================================
// PROCESSED MESSAGE TRACKING
// ============================================================

const processedMessages = new Set();
let isProcessing = false;
const POLL_INTERVAL = 30 * 1000; // 30 seconds

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    processedCount: processedMessages.size,
    isProcessing,
    uptime: Math.floor(process.uptime())
  });
});

// Manual trigger endpoint (for testing)
app.post('/trigger', async (req, res) => {
  console.log('[MANUAL] Trigger received');
  res.json({ status: 'triggered' });
  await pollForEmails();
});

// ============================================================
// LEGACY WEBHOOK (keep for backward compatibility with Zapier)
// ============================================================

app.post('/webhook/new-email', async (req, res) => {
  console.log('[WEBHOOK] POST /webhook/new-email (legacy Zapier)');

  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { from_name, from_email, subject, body, message_id, thread_id } = req.body;

  console.log(`[WEBHOOK] From: ${from_name} <${from_email}>`);
  console.log(`[WEBHOOK] Subject: ${subject}`);

  res.json({ status: 'processing' });

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
    }
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error.message);
  }
});

// ============================================================
// GMAIL POLLING LOOP
// ============================================================

async function pollForEmails() {
  if (isProcessing) {
    console.log('[POLL] Already processing, skipping...');
    return;
  }

  isProcessing = true;

  try {
    // Get all messages with "Agent" label
    const messages = await getAgentLabeledMessages();
    
    if (messages.length === 0) {
      isProcessing = false;
      return;
    }

    // Group messages by thread to find the latest message in each thread
    const threadMap = new Map();
    for (const msg of messages) {
      const full = await getFullMessage(msg.id);
      const parsed = parseMessage(full);
      
      if (!threadMap.has(parsed.threadId)) {
        threadMap.set(parsed.threadId, parsed);
      } else {
        // Keep the latest message in the thread
        const existing = threadMap.get(parsed.threadId);
        if (parsed.internalDate > existing.internalDate) {
          threadMap.set(parsed.threadId, parsed);
        }
      }
    }

    // Process each thread's latest unprocessed message
    for (const [threadId, latestMsg] of threadMap) {
      if (processedMessages.has(latestMsg.id)) {
        continue; // Already processed
      }

      console.log('============================================================');
      console.log(`[NEW EMAIL] From: ${latestMsg.from_name} <${latestMsg.from_email}>`);
      console.log(`[SUBJECT] ${latestMsg.subject}`);
      console.log(`[MSG ID] ${latestMsg.id}`);
      console.log(`[BODY] ${(latestMsg.body || '').substring(0, 200)}...`);
      console.log(`[ATTACHMENTS] ${latestMsg.attachments.length} found`);

      // Skip internal emails and auto-replies
      const fromEmail = latestMsg.from_email.toLowerCase();
      const userEmail = (process.env.GMAIL_USER_EMAIL || '').toLowerCase();
      if (fromEmail === userEmail) {
        console.log('[SKIP] Email from self, skipping');
        processedMessages.add(latestMsg.id);
        continue;
      }

      const subject = (latestMsg.subject || '').toLowerCase();
      if (subject.includes('auto-reply') || subject.includes('automatic reply') || subject.includes('out of office')) {
        console.log('[SKIP] Auto-reply, skipping');
        processedMessages.add(latestMsg.id);
        continue;
      }

      // Process attachments (images, PDFs)
      let visionContent = [];
      if (latestMsg.attachments.length > 0) {
        console.log(`[ATTACHMENTS] Processing ${latestMsg.attachments.length} attachment(s)...`);
        visionContent = await processAttachments(latestMsg.attachments);
        console.log(`[ATTACHMENTS] ${visionContent.length} ready for Vision`);
      }

      // Run the agent
      try {
        const result = await runAgent({
          from_name: latestMsg.from_name,
          from_email: latestMsg.from_email,
          subject: latestMsg.subject,
          body: latestMsg.body,
          message_id: latestMsg.message_id,
          thread_id: latestMsg.thread_id,
          visionContent: visionContent
        });

        if (result && result.draft_html) {
          const replyTo = result.reply_to || latestMsg.from_email;
          const replyName = result.dealer_name || latestMsg.from_name;
          const draftSubject = result.subject || `Re: ${latestMsg.subject}`;

          console.log(`[REPLY TO] ${replyName} <${replyTo}>`);

          const draftResult = await createGmailDraft({
            to: `${replyName} <${replyTo}>`,
            subject: draftSubject,
            htmlBody: result.draft_html,
            messageId: latestMsg.message_id,
            threadId: latestMsg.thread_id
          });

          console.log(`[GMAIL] Draft created: ${draftResult.id}`);
        } else {
          console.log('[AGENT] No draft generated');
        }

        // Mark as processed regardless of outcome
        processedMessages.add(latestMsg.id);

      } catch (error) {
        console.error('[AGENT ERROR]', error.message);
        console.error(error.stack);
        // Still mark as processed to avoid infinite retry loop
        // The error is logged for manual review
        processedMessages.add(latestMsg.id);
      }
    }

  } catch (error) {
    console.error('[POLL ERROR]', error.message);
  } finally {
    isProcessing = false;
  }
}

// ============================================================
// START SERVER + POLLING
// ============================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`FC-BIOS Email Agent running on port ${PORT}`);
  console.log(`Gmail polling every ${POLL_INTERVAL / 1000}s`);
  console.log(`Webhook endpoint still available at /webhook/new-email`);

  // Verify Gmail access on startup
  try {
    const labelId = await getAgentLabelId();
    if (labelId) {
      console.log(`[STARTUP] Gmail connected. Agent label found: ${labelId}`);
    } else {
      console.error('[STARTUP] WARNING: "Agent" label not found in Gmail!');
    }
  } catch (err) {
    console.error('[STARTUP] Gmail connection failed:', err.message);
    console.error('[STARTUP] Check your GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
  }

  // Start polling loop
  setInterval(pollForEmails, POLL_INTERVAL);
  
  // Run first poll immediately
  console.log('[STARTUP] Running first poll...');
  await pollForEmails();
});
