const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

async function createGmailDraft({ to, subject, htmlBody, threadId, messageId, agentNotes }) {
  const fromEmail = process.env.GMAIL_USER_EMAIL || 'dealersupport@fcbios.com.my';

  let fullBody = htmlBody;
  if (agentNotes) {
    fullBody = `<div style="background:#fff3cd;border:1px solid #ffc107;padding:12px;margin-bottom:16px;border-radius:6px;font-family:Arial,sans-serif;font-size:13px;color:#856404;">${agentNotes}</div>\n${htmlBody}`;
  }

  const headers = [
    `From: Dealer Support <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`
  ];
  if (messageId) {
    headers.push(`In-Reply-To: ${messageId}`);
    headers.push(`References: ${messageId}`);
  }

  const email = headers.join('\r\n') + '\r\n\r\n' + fullBody;
  const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const draftParams = {
    userId: 'me',
    requestBody: { message: { raw: encodedEmail } }
  };
  if (threadId) draftParams.requestBody.message.threadId = threadId;

  const draft = await gmail.users.drafts.create(draftParams);
  return draft.data;
}

module.exports = { createGmailDraft };
