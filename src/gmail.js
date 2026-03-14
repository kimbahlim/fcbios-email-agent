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
  return data.access_token;
}

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

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts`, {
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

module.exports = { createGmailDraft };
