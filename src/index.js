const express = require('express');
const { runAgent } = require('./agent');
const {
  getAgentLabeledMessages,
  getFullMessage,
  getThreadMessages,
  parseMessage,
  processAttachments,
  createGmailDraft,
  swapAgentLabel
} = require('./gmail');

const app = express();
app.use(express.json());

// ============================================================
// PROCESSED MESSAGE TRACKING
// ============================================================

const processedMessages = new Set();
const processedThreads = new Map(); // threadId → timestamp of when we processed it
let isProcessing = false;
const POLL_INTERVAL = 30 * 1000; // 30 seconds
const THREAD_COOLDOWN = 10 * 60 * 1000; // 10 minutes — ignore new messages in same thread for 10 min after processing

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

// Debug endpoint - checks what the token can actually do
app.get('/debug/gmail', async (req, res) => {
  const { getAccessToken } = require('./gmail');
  const results = {};
  
  try {
    // 1. Get access token
    const token = await getAccessToken();
    results.token = 'OK - got access token';
    
    // 2. Check token info (shows actual scopes)
    const tokenInfo = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
    const tokenData = await tokenInfo.json();
    results.token_scopes = tokenData.scope || tokenData;
    results.token_email = tokenData.email;
    results.token_expires_in = tokenData.expires_in;
    
    // 3. Try listing labels
    try {
      const labelsRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const labelsData = await labelsRes.json();
      results.list_labels = labelsRes.ok ? `OK - ${labelsData.labels?.length} labels` : `FAILED ${labelsRes.status}: ${JSON.stringify(labelsData).substring(0, 200)}`;
    } catch (e) { results.list_labels = `ERROR: ${e.message}`; }
    
    // 4. Try searching messages
    try {
      const msgRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=label:agent&maxResults=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const msgData = await msgRes.json();
      results.search_messages = msgRes.ok ? `OK - ${msgData.messages?.length || 0} messages` : `FAILED ${msgRes.status}: ${JSON.stringify(msgData).substring(0, 200)}`;
    } catch (e) { results.search_messages = `ERROR: ${e.message}`; }
    
    // 5. Try creating draft (existing scope)
    try {
      const draftRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const draftData = await draftRes.json();
      results.list_drafts = draftRes.ok ? `OK - ${draftData.drafts?.length || 0} drafts` : `FAILED ${draftRes.status}: ${JSON.stringify(draftData).substring(0, 200)}`;
    } catch (e) { results.list_drafts = `ERROR: ${e.message}`; }
    
  } catch (e) {
    results.error = e.message;
  }
  
  console.log('[DEBUG] Gmail results:', JSON.stringify(results, null, 2));
  res.json(results);
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
      if (result.cc) console.log(`[CC] ${result.cc}`);

      const draftResult = await createGmailDraft({
        to: `${replyName} <${replyTo}>`,
        cc: result.cc || null,
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
      try {
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
      } catch (parseErr) {
        console.error(`[PARSE ERROR] Failed to parse message ${msg.id}: ${parseErr.message}`);
      }
    }

    console.log(`[POLL] ${threadMap.size} thread(s) to process`);

    // Process each thread's latest unprocessed message
    for (const [threadId, latestMsg] of threadMap) {
      console.log(`[POLL] Checking thread ${threadId}, msg ${latestMsg.id}, from: ${latestMsg.from_email}`);
      
      if (processedMessages.has(latestMsg.id)) {
        console.log(`[SKIP] Already processed msg ${latestMsg.id} — ensuring Agent label is cleared to break poll loop`);
        // Defensive: if the label is still on this thread, the poller will keep finding it.
        // Swap to "Agent Replied" so it stops appearing in label:agent queries.
        await swapAgentLabel(latestMsg.id, latestMsg.thread_id);
        continue; // Already processed this exact message
      }

      // THREAD COOLDOWN: Skip if we recently processed this thread (prevents double drafts)
      const lastProcessedTime = processedThreads.get(threadId);
      if (lastProcessedTime && (Date.now() - lastProcessedTime) < THREAD_COOLDOWN) {
        console.log(`[SKIP] Thread ${threadId} in cooldown (processed ${Math.round((Date.now() - lastProcessedTime) / 1000)}s ago), skipping msg ${latestMsg.id}`);
        processedMessages.add(latestMsg.id);
        await swapAgentLabel(latestMsg.id, latestMsg.thread_id);
        continue;
      }

      console.log('============================================================');
      console.log(`[NEW EMAIL] From: ${latestMsg.from_name} <${latestMsg.from_email}>`);
      console.log(`[SUBJECT] ${latestMsg.subject}`);
      console.log(`[MSG ID] ${latestMsg.id}`);
      console.log(`[BODY] ${(latestMsg.body || '').substring(0, 500)}...`);
      console.log(`[ATTACHMENTS] ${latestMsg.attachments.length} found`);

      // THREAD CONTEXT: If the latest message body is short and references "below" content,
      // the actual product info might be in an earlier message in the thread.
      // Fetch the full thread and append earlier message bodies as context.
      const bodyLen = (latestMsg.body || '').length;
      const refsBelow = /below|as per|above|previous|earlier|attached|refer to/i.test(latestMsg.body || '');
      if (bodyLen < 500 && refsBelow) {
        try {
          console.log(`[THREAD] Short body (${bodyLen} chars) references earlier content — fetching thread context`);
          const threadMsgs = await getThreadMessages(latestMsg.thread_id);
          // Get bodies of OTHER messages in the thread (not the latest one)
          const otherBodies = [];
          for (const tmsg of threadMsgs) {
            if (tmsg.id !== latestMsg.id) {
              const parsed = parseMessage(tmsg);
              if (parsed.body && parsed.body.length > 50) {
                otherBodies.push(parsed.body);
              }
            }
          }
          if (otherBodies.length > 0) {
            const threadContext = otherBodies.join('\n\n---\n\n');
            latestMsg.body = latestMsg.body + '\n\n--- PREVIOUS MESSAGES IN THREAD ---\n\n' + threadContext;
            console.log(`[THREAD] Added ${otherBodies.length} earlier message(s) as context (${threadContext.length} chars)`);
          }
        } catch (e) {
          console.log(`[THREAD] Error fetching thread context: ${e.message}`);
        }
      }

      // Skip auto-replies
      const subjectLower = (latestMsg.subject || '').toLowerCase();
      if (subjectLower.includes('auto-reply') || subjectLower.includes('automatic reply') || subjectLower.includes('out of office')) {
        console.log('[SKIP] Auto-reply, skipping');
        processedMessages.add(latestMsg.id);
        await swapAgentLabel(latestMsg.id, latestMsg.thread_id);
        continue;
      }

      // Skip our OWN SENT REPLIES (not self-forwarded enquiries)
      // The key difference: sent replies contain our quotation signature in the NEW content
      // We only check the part BEFORE any quoted thread (before "On ... wrote:" or "---------- Forwarded")
      const fullBody = (latestMsg.body || '');
      const bodyLower = fullBody.toLowerCase();
      
      // Extract only the NEW content (before quoted thread history)
      let newContentOnly = fullBody;
      const quoteMarkers = [
        /\nOn .{10,80} wrote:/i,
        /\n-{5,}\s*Forwarded message/i,
        /\nFrom:.*\nSent:.*\nTo:/i,
        /\n_{5,}\s*\nFrom:/i
      ];
      for (const marker of quoteMarkers) {
        const match = newContentOnly.match(marker);
        if (match) {
          newContentOnly = newContentOnly.substring(0, match.index);
          break;
        }
      }
      const newContentLower = newContentOnly.toLowerCase();
      
      // Check signature only in the NEW content, not the quoted thread
      const hasOurSignature = newContentLower.includes('dealer support channel') && newContentLower.includes('fc bios sdn bhd') && newContentLower.includes('019-2663675');
      const fromEmail = latestMsg.from_email.toLowerCase().trim();
      const userEmail = (process.env.GMAIL_USER_EMAIL || '').toLowerCase().trim();
      const isFromSelf = (fromEmail === userEmail || fromEmail.includes('dealer_support') || fromEmail.includes('dealer-support'));
      
      if (isFromSelf && hasOurSignature) {
        console.log(`[SKIP] Sent reply from self with signature, skipping`);
        processedMessages.add(latestMsg.id);
        await swapAgentLabel(latestMsg.id, latestMsg.thread_id);
        continue;
      }
      
      if (isFromSelf) {
        console.log(`[SELF-FORWARD] Email from self but no signature — treating as forwarded dealer enquiry`);
      }

      const subject = (latestMsg.subject || '').toLowerCase();
      if (subject.includes('auto-reply') || subject.includes('automatic reply') || subject.includes('out of office')) {
        console.log('[SKIP] Auto-reply, skipping');
        processedMessages.add(latestMsg.id);
        await swapAgentLabel(latestMsg.id, latestMsg.thread_id);
        continue;
      }

      // Process attachments (images, PDFs)
      let visionContent = [];
      if (latestMsg.attachments.length > 0) {
        // Smart filter: check if email body already contains product info (SKUs, product names)
        // If body has clear product requests, skip image processing to save costs
        // (signature banners, social media icons etc. waste Vision credits)
        const bodyText = (latestMsg.body || '').toLowerCase();
        
        // Check if body references content that might be in images/attachments
        const bodyReferencesAttachment = /below|attached|see image|as per|item code|item list|following item|please.*quote|kindly.*quote|offer.*price|price.*below/i.test(latestMsg.body);
        const bodyIsTruncated = bodyText.includes('...') || bodyText.length < 200;
        
        const hasProductInfo = !bodyIsTruncated && !bodyReferencesAttachment && (
          /[a-z]\d{2}-[a-z]\d{2,}/i.test(latestMsg.body) || // SKU pattern like H05-M1881 (tighter match)
          (bodyText.split('\n').filter(l => /^\s*\d+[\.\)]\s+\S{5,}/.test(l)).length >= 2) // At least 2 numbered items with real content
        );
        
        const hasPDFAttachment = latestMsg.attachments.some(a => 
          (a.mimeType || '').toLowerCase() === 'application/pdf');
        const hasExcelAttachment = latestMsg.attachments.some(a => 
          (a.mimeType || '').toLowerCase().includes('spreadsheet') || 
          (a.mimeType || '').toLowerCase().includes('excel'));
        const hasNamedImageAttachment = latestMsg.attachments.some(a => {
          const fn = (a.filename || '').toLowerCase();
          const isImage = ['image/png', 'image/jpeg', 'image/jpg'].includes((a.mimeType || '').toLowerCase());
          // Named image (not image00x pattern) = likely intentional attachment, not signature
          return isImage && fn && !fn.match(/^image\d+\./) && !fn.startsWith('outlook');
        });
        
        if (hasProductInfo && !hasPDFAttachment && !hasExcelAttachment && !hasNamedImageAttachment) {
          console.log(`[ATTACHMENTS] Body already has product info — skipping ${latestMsg.attachments.length} image(s) to save Vision costs`);
        } else {
          console.log(`[ATTACHMENTS] Processing ${latestMsg.attachments.length} attachment(s)...`);
          visionContent = await processAttachments(latestMsg.attachments, latestMsg.body, latestMsg.htmlBody);
          console.log(`[ATTACHMENTS] ${visionContent.length} ready for Vision`);
        }
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
          if (result.cc) console.log(`[CC] ${result.cc}`);

          const draftResult = await createGmailDraft({
            to: `${replyName} <${replyTo}>`,
            cc: result.cc || null,
            subject: draftSubject,
            htmlBody: result.draft_html,
            messageId: latestMsg.message_id,
            threadId: latestMsg.thread_id
          });

          console.log(`[GMAIL] Draft created: ${draftResult.id}`);

          // Swap label: "Agent" → "Agent Replied" to prevent reprocessing
          await swapAgentLabel(latestMsg.id, latestMsg.thread_id);
          
          // Mark as processed ONLY on success
          processedMessages.add(latestMsg.id);
          processedThreads.set(latestMsg.thread_id, Date.now());
          console.log(`[THREAD] Cooldown set for thread ${latestMsg.thread_id} (10 min)`);
        } else {
          console.log('[AGENT] No draft generated');
          // Track retry count — give up after 3 attempts
          const retryKey = `retry_${latestMsg.id}`;
          const retries = processedThreads.get(retryKey) || 0;
          if (retries >= 2) {
            console.log(`[AGENT] Giving up after ${retries + 1} attempts — marking as processed`);
            processedMessages.add(latestMsg.id);
            processedThreads.set(latestMsg.thread_id, Date.now());
            await swapAgentLabel(latestMsg.id, latestMsg.thread_id);
            console.log(`[THREAD] Cooldown set for thread ${latestMsg.thread_id} (10 min)`);
          } else {
            processedThreads.set(retryKey, retries + 1);
            console.log(`[AGENT] Will retry (attempt ${retries + 1}/3) on next poll`);
            // NO cooldown on failure — let retry happen on next poll (30s)
          }
        }

      } catch (error) {
        console.error('[AGENT ERROR]', error.message);
        console.error(error.stack);
        // Track retry count on error too
        const retryKey = `retry_${latestMsg.id}`;
        const retries = processedThreads.get(retryKey) || 0;
        if (retries >= 2) {
          console.log(`[AGENT] Giving up after ${retries + 1} failed attempts — marking as processed`);
          processedMessages.add(latestMsg.id);
          await swapAgentLabel(latestMsg.id, latestMsg.thread_id);
        } else {
          processedThreads.set(retryKey, retries + 1);
          console.log(`[AGENT] Error — will retry (attempt ${retries + 1}/3)`);
        }
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
    const messages = await getAgentLabeledMessages();
    console.log(`[STARTUP] Gmail connected. Found ${messages.length} messages with "Agent" label`);
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
