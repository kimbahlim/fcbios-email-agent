const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  const data = await response.json();
  if (!data.access_token) {
    console.error('[GMAIL] Token error:', JSON.stringify(data));
    throw new Error('Failed to get access token');
  }
  return data.access_token;
}

async function gmailApi(path, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${GMAIL_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API ${response.status}: ${errText}`);
  }
  return response.json();
}

// ============================================================
// POLLING: Find new emails with "Agent" label
// ============================================================

async function getAgentLabeledMessages() {
  try {
    // Use search query instead of label ID lookup — avoids needing ListLabels permission
    const data = await gmailApi(`/messages?q=label:agent&maxResults=10`);
    return data.messages || [];
  } catch (err) {
    console.error('[GMAIL] Error fetching messages:', err.message);
    return [];
  }
}

async function getFullMessage(messageId) {
  return gmailApi(`/messages/${messageId}?format=full`);
}

async function getThreadMessages(threadId) {
  const data = await gmailApi(`/threads/${threadId}?format=full`);
  return data.messages || [];
}

// ============================================================
// PARSE EMAIL: Extract headers, body, and attachments
// ============================================================

function getHeader(headers, name) {
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

function extractEmailAddress(fromHeader) {
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1] : fromHeader;
}

function extractEmailName(fromHeader) {
  const match = fromHeader.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : fromHeader.split('@')[0];
}

function decodeBase64Url(data) {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function extractTextBody(payload) {
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data).toString('utf-8');
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decodeBase64Url(part.body.data).toString('utf-8');
      }
    }
    for (const part of payload.parts) {
      const text = extractTextBody(part);
      if (text) return text;
    }
  }
  
  return '';
}

function findAttachments(payload, messageId) {
  const attachments = [];
  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  const pdfType = 'application/pdf';
  const excelTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  const supportedTypes = [...imageTypes, pdfType, ...excelTypes];
  
  function traverse(part) {
    if (part.filename && part.body && part.body.attachmentId) {
      const mimeType = (part.mimeType || '').toLowerCase();
      if (supportedTypes.includes(mimeType)) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          attachmentId: part.body.attachmentId,
          size: part.body.size || 0,
          messageId: messageId
        });
      }
    }
    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }
  
  traverse(payload);
  return attachments;
}

async function downloadAttachment(messageId, attachmentId) {
  const data = await gmailApi(`/messages/${messageId}/attachments/${attachmentId}`);
  return data.data;
}

function parseMessage(msg) {
  const headers = msg.payload.headers || [];
  const from = getHeader(headers, 'From');
  const subject = getHeader(headers, 'Subject');
  const messageId = getHeader(headers, 'Message-ID') || msg.id;
  const date = getHeader(headers, 'Date');
  const body = extractTextBody(msg.payload);
  const attachments = findAttachments(msg.payload, msg.id);
  
  return {
    id: msg.id,
    threadId: msg.threadId,
    from_name: extractEmailName(from),
    from_email: extractEmailAddress(from),
    subject,
    body,
    message_id: messageId,
    thread_id: msg.threadId,
    date,
    attachments,
    internalDate: parseInt(msg.internalDate || '0')
  };
}

// ============================================================
// ATTACHMENT PROCESSING: Download and prepare for Claude Vision
// ============================================================

async function processAttachments(attachments) {
  const visionContent = [];
  
  for (const att of attachments) {
    try {
      console.log(`[ATTACHMENT] Downloading: ${att.filename} (${att.mimeType}, ${att.size} bytes)`);
      const base64Data = await downloadAttachment(att.messageId, att.attachmentId);
      const standardBase64 = base64Data.replace(/-/g, '+').replace(/_/g, '/');
      
      const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      
      if (imageTypes.includes(att.mimeType.toLowerCase())) {
        visionContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: att.mimeType,
            data: standardBase64
          }
        });
        console.log(`[ATTACHMENT] Image ready for Vision: ${att.filename}`);
      } else if (att.mimeType === 'application/pdf') {
        visionContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: standardBase64
          }
        });
        console.log(`[ATTACHMENT] PDF ready for Vision: ${att.filename}`);
      } else {
        console.log(`[ATTACHMENT] Skipping unsupported type: ${att.mimeType}`);
      }
    } catch (err) {
      console.error(`[ATTACHMENT] Error downloading ${att.filename}:`, err.message);
    }
  }
  
  return visionContent;
}

// ============================================================
// DRAFT CREATION (existing functionality)
// ============================================================

async function createGmailDraft({ to, subject, htmlBody, messageId, threadId }) {
  const accessToken = await getAccessToken();
  const userEmail = process.env.GMAIL_USER_EMAIL;

  let headers = [
    `From: ${userEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8'
  ];

  if (messageId) headers.push(`In-Reply-To: ${messageId}`);
  if (messageId) headers.push(`References: ${messageId}`);

  const email = headers.join('\r\n') + '\r\n\r\n' + htmlBody;
  const encodedEmail = Buffer.from(email).toString('base64url');

  const body = { message: { raw: encodedEmail } };
  if (threadId) body.message.threadId = threadId;

  const response = await fetch(`${GMAIL_BASE}/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Gmail API error: ${JSON.stringify(result)}`);
  }
  return result;
}

module.exports = {
  getAccessToken,
  getAgentLabeledMessages,
  getFullMessage,
  getThreadMessages,
  parseMessage,
  processAttachments,
  downloadAttachment,
  createGmailDraft
};
