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
    // Only fetch Agent-labeled emails from the last 2 hours to avoid reprocessing old emails on restart
    const data = await gmailApi(`/messages?q=label:agent+newer_than:30m&maxResults=10`);
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
  let plainTexts = [];
  let htmlTexts = [];
  
  function findParts(part, depth = 0) {
    const indent = '  '.repeat(depth);
    const size = part.body && part.body.data ? Math.round(part.body.data.length * 0.75) : (part.body && part.body.size ? part.body.size : 0);
    const fname = part.filename ? ` [${part.filename}]` : '';
    console.log(`[MIME] ${indent}${part.mimeType}${fname} (${size} bytes)`);
    
    if (part.mimeType === 'text/plain' && part.body && part.body.data) {
      plainTexts.push(decodeBase64Url(part.body.data).toString('utf-8'));
    }
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      htmlTexts.push(decodeBase64Url(part.body.data).toString('utf-8'));
    }
    // Handle forwarded emails embedded as message/rfc822
    if (part.mimeType === 'message/rfc822' && part.parts) {
      console.log('[MIME] Found embedded message/rfc822 — extracting forwarded content');
      for (const subpart of part.parts) {
        findParts(subpart, depth + 1);
      }
    }
    if (part.parts) {
      for (const subpart of part.parts) {
        findParts(subpart, depth + 1);
      }
    }
  }
  
  findParts(payload);
  
  const plainText = plainTexts.join('\n');
  const htmlRaw = htmlTexts.join('\n');
  
  console.log(`[EMAIL] Found ${plainTexts.length} text/plain part(s) (${plainText.length} chars), ${htmlTexts.length} text/html part(s) (${htmlRaw.length} chars)`);
  
  // Always extract text from HTML and compare with plain text
  if (htmlRaw) {
    const stripped = htmlRaw
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' | ')
      .replace(/<\/th>/gi, ' | ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Check if HTML has product info that plain text is missing
    const htmlHasSkus = /B\d{4,5}/i.test(stripped) || /[A-Z]\d{2}-[A-Z]\d{2,}/i.test(stripped);
    const plainHasSkus = /B\d{4,5}/i.test(plainText) || /[A-Z]\d{2}-[A-Z]\d{2,}/i.test(plainText);
    
    console.log(`[EMAIL] SKU check — plain: ${plainHasSkus}, html: ${htmlHasSkus}`);
    console.log(`[EMAIL] Plain text preview: ${plainText.substring(0, 300)}`);
    console.log(`[EMAIL] HTML stripped preview: ${stripped.substring(0, 300)}`);
    
    if (htmlHasSkus && !plainHasSkus) {
      console.log(`[EMAIL] HTML body contains SKUs not found in plain text — using HTML (${stripped.length} chars)`);
      return stripped;
    }
    
    // If both have SKUs or neither has, use whichever is longer
    if (stripped.length > plainText.length + 50) {
      console.log(`[EMAIL] HTML body has more content (${stripped.length} chars) than plain text (${plainText.length} chars) — using HTML`);
      return stripped;
    } else {
      console.log(`[EMAIL] HTML stripped to ${stripped.length} chars vs plain text ${plainText.length} chars — using plain text`);
    }
  }
  
  return plainText || '';
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
    const mimeType = (part.mimeType || '').toLowerCase();
    const hasAttachmentId = part.body && part.body.attachmentId;
    
    if (hasAttachmentId && supportedTypes.includes(mimeType)) {
      // Accept if has filename OR if it's an inline image (no filename but has attachmentId)
      if (part.filename || imageTypes.includes(mimeType)) {
        attachments.push({
          filename: part.filename || `inline-image-${attachments.length + 1}.${mimeType.split('/')[1] || 'png'}`,
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

// Detect actual image format from magic bytes (first few bytes of file).
// Email clients often mislabel inline images (e.g., declaring a JPEG as image/png).
// Anthropic's API rejects mismatches, so we sniff the actual format and override.
// Returns the correct image/* media type, or null if not a recognized image format.
function detectImageMediaType(base64Data) {
  // Decode just the first 12 bytes — enough for all common image format signatures
  const buf = Buffer.from(base64Data.substring(0, 24), 'base64');
  if (buf.length < 4) return null;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  // GIF: 47 49 46 38 ("GIF8")
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  // WEBP: starts with "RIFF" then 4 size bytes then "WEBP"
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  return null;
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
  
  // Also extract raw HTML to find inline images embedded as external URLs
  const htmlBody = extractHtmlBody(msg.payload);
  
  return {
    id: msg.id,
    threadId: msg.threadId,
    from_name: extractEmailName(from),
    from_email: extractEmailAddress(from),
    subject,
    body,
    htmlBody,
    message_id: messageId,
    thread_id: msg.threadId,
    date,
    attachments,
    internalDate: parseInt(msg.internalDate || '0')
  };
}

function extractHtmlBody(payload) {
  let html = '';
  function find(part) {
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      html += decodeBase64Url(part.body.data).toString('utf-8');
    }
    if (part.parts) part.parts.forEach(find);
  }
  find(payload);
  return html;
}

// ============================================================
// ATTACHMENT PROCESSING: Download and prepare for Claude Vision
// ============================================================

async function processAttachments(attachments, emailBody = '', htmlBody = '') {
  const visionContent = [];
  
  // Also check for external inline images embedded in HTML body
  // (e.g. ci3.googleusercontent.com URLs — these are NOT Gmail attachment parts)
  if (htmlBody) {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(htmlBody)) !== null) {
      const src = match[1];
      // Skip tracking pixels, logos, icons — only fetch substantial external images
      if (src.startsWith('http') && 
          !src.includes('gstatic.com') && 
          !src.includes('google.com/images') &&
          !src.includes('googleusercontent.com/proxy') &&
          src.includes('googleusercontent.com')) {
        try {
          console.log(`[ATTACHMENT] Fetching external inline image: ${src.substring(0, 80)}...`);
          const imgResponse = await fetch(src);
          if (imgResponse.ok) {
            const buffer = await imgResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
            const sizeKB = Math.round(buffer.byteLength / 1024);
            if (buffer.byteLength > 5000) { // skip tiny tracking pixels
              console.log(`[ATTACHMENT] External inline image fetched: ${sizeKB}KB, ${contentType}`);
              visionContent.push({
                type: 'image',
                source: { type: 'base64', media_type: contentType, data: base64 }
              });
            } else {
              console.log(`[ATTACHMENT] Skipping tiny external image (${sizeKB}KB) — likely tracking pixel`);
            }
          }
        } catch (err) {
          console.log(`[ATTACHMENT] Failed to fetch external inline image: ${err.message}`);
        }
      }
    }
  }
  
  for (const att of attachments) {
    try {
      // Skip email signature/branding images — these are NOT product images
      const filenameLower = (att.filename || '').toLowerCase();
      const isSignatureImage = 
        filenameLower.includes('outlook') || filenameLower.includes('logo') || 
        filenameLower.includes('icon') || filenameLower.includes('signature') ||
        filenameLower.includes('banner') || filenameLower.includes('footer') ||
        filenameLower.includes('header') || filenameLower.includes('email-bg') ||
        (filenameLower.startsWith('outlook-') && ['image/png', 'image/jpeg', 'image/gif'].includes(att.mimeType.toLowerCase()));
      
      // image00x files (Gmail inline): usually signature/branding images
      // BUT if the email body says "below" or "as per below", the image might BE the content
      const isGenericInlineImage = filenameLower.startsWith('image00') || filenameLower.match(/^image\d+\./);
      
      if (isSignatureImage) {
        console.log(`[ATTACHMENT] Skipping signature/branding image: ${att.filename} (${att.size} bytes)`);
        continue;
      }
      
      // Check if body references content that might be in this image
      const bodyRefsBelow = /below|attached|as per|item code|item list|see image|please.*quote|kindly.*quote|quote.*following|offer.*price/i.test(emailBody);
      
      // If body references "below" content, KEEP the image regardless of size — it's likely the product list
      if (isGenericInlineImage && bodyRefsBelow) {
        console.log(`[ATTACHMENT] Keeping inline image — body references content below: ${att.filename} (${att.size} bytes)`);
      } else if (isGenericInlineImage && att.size < 50000) {
        console.log(`[ATTACHMENT] Skipping small inline image (likely signature): ${att.filename} (${att.size} bytes)`);
        continue;
      }
      
      // Skip very small images (under 10KB) regardless of name — almost always icons/avatars
      // EXCEPTION: if body references "below" content, keep even small images — they might be product lists
      if (att.size < 10000 && ['image/png', 'image/jpeg', 'image/gif'].includes(att.mimeType.toLowerCase()) && !bodyRefsBelow) {
        console.log(`[ATTACHMENT] Skipping tiny image: ${att.filename} (${att.size} bytes)`);
        continue;
      }
      
      console.log(`[ATTACHMENT] Downloading: ${att.filename} (${att.mimeType}, ${att.size} bytes)`);
      
      // Skip images over 5MB — Claude API limit is 5MB for base64 images
      // base64 encoding adds ~33% overhead, so raw file limit is ~3.75MB
      if (att.size > 3750000 && ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'].includes(att.mimeType.toLowerCase())) {
        console.log(`[ATTACHMENT] Skipping oversized image: ${att.filename} (${att.size} bytes > 3.75MB raw / 5MB base64 limit)`);
        continue;
      }
      
      const base64Data = await downloadAttachment(att.messageId, att.attachmentId);
      const standardBase64 = base64Data.replace(/-/g, '+').replace(/_/g, '/');
      
      const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      
      if (imageTypes.includes(att.mimeType.toLowerCase())) {
        // Sniff the actual format — email clients often mislabel inline images
        // (e.g., declaring a JPEG as image/png). Anthropic API rejects the mismatch.
        const detectedType = detectImageMediaType(standardBase64);
        let finalMediaType = att.mimeType.toLowerCase();
        if (finalMediaType === 'image/jpg') finalMediaType = 'image/jpeg'; // normalize
        if (detectedType && detectedType !== finalMediaType) {
          console.log(`[ATTACHMENT] MIME mismatch for ${att.filename}: declared ${finalMediaType}, actual ${detectedType} — using actual`);
          finalMediaType = detectedType;
        } else if (!detectedType) {
          console.log(`[ATTACHMENT] Could not detect image format for ${att.filename} — trusting declared ${finalMediaType}`);
        }
        visionContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: finalMediaType,
            data: standardBase64
          }
        });
        console.log(`[ATTACHMENT] Image ready for Vision: ${att.filename} (${finalMediaType})`);
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

async function createGmailDraft({ to, cc, subject, htmlBody, messageId, threadId }) {
  const accessToken = await getAccessToken();
  const userEmail = process.env.GMAIL_USER_EMAIL;

  let headers = [
    `From: ${userEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8'
  ];

  if (cc) headers.splice(2, 0, `Cc: ${cc}`);
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

// ============================================================
// LABEL MANAGEMENT: Swap "Agent" → "Agent Replied" after processing
// ============================================================

let labelCache = {}; // cache label name → ID mapping

async function getLabelId(labelName) {
  if (labelCache[labelName]) return labelCache[labelName];
  
  try {
    const data = await gmailApi('/labels');
    const labels = data.labels || [];
    for (const label of labels) {
      labelCache[label.name.toLowerCase()] = label.id;
    }
    return labelCache[labelName.toLowerCase()] || null;
  } catch (err) {
    console.error('[GMAIL] Error fetching labels:', err.message);
    return null;
  }
}

async function createLabel(labelName) {
  try {
    const data = await gmailApi('/labels', {
      method: 'POST',
      body: JSON.stringify({
        name: labelName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show'
      })
    });
    console.log(`[GMAIL] Created label "${labelName}" with ID: ${data.id}`);
    labelCache[labelName.toLowerCase()] = data.id;
    return data.id;
  } catch (err) {
    // Label might already exist
    console.log(`[GMAIL] Label "${labelName}" may already exist: ${err.message}`);
    return await getLabelId(labelName);
  }
}

async function swapAgentLabel(messageId, threadId) {
  try {
    // Get the "Agent" label ID
    const agentLabelId = await getLabelId('agent');
    if (!agentLabelId) {
      console.log('[GMAIL] Could not find "Agent" label ID');
      return;
    }

    // Get or create the "Agent Replied" label ID
    let repliedLabelId = await getLabelId('agent replied');
    if (!repliedLabelId) {
      repliedLabelId = await createLabel('Agent Replied');
    }
    if (!repliedLabelId) {
      console.log('[GMAIL] Could not get/create "Agent Replied" label');
      return;
    }

    // Swap labels on the specific message first
    await gmailApi(`/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        addLabelIds: [repliedLabelId],
        removeLabelIds: [agentLabelId]
      })
    });
    console.log(`[GMAIL] Label swapped: "Agent" → "Agent Replied" for message ${messageId}`);

    // Also swap on the thread level to catch thread-level label application
    if (threadId) {
      try {
        await gmailApi(`/threads/${threadId}/modify`, {
          method: 'POST',
          body: JSON.stringify({
            addLabelIds: [repliedLabelId],
            removeLabelIds: [agentLabelId]
          })
        });
        console.log(`[GMAIL] Label also swapped at thread level for thread ${threadId}`);
      } catch (threadErr) {
        console.log(`[GMAIL] Thread-level label swap failed (non-critical): ${threadErr.message}`);
      }
    }
  } catch (err) {
    console.error(`[GMAIL] Error swapping labels: ${err.message}`);
  }
}

module.exports = {
  getAccessToken,
  getAgentLabeledMessages,
  getFullMessage,
  getThreadMessages,
  parseMessage,
  processAttachments,
  downloadAttachment,
  createGmailDraft,
  swapAgentLabel
};
