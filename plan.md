# Plan to Integrate OpenAI API into LinkedIn Comment Generator Extension

This document outlines the plan to modify the Chrome extension to use the OpenAI API directly for comment generation, replacing the current n8n webhook integration.

## 2. Revised Plan

- **Update API_CONFIG**: Move API_CONFIG out of `content.js` into `manifest.json` under `"env": { "OPENAI_API_KEY": "<YOUR_KEY>" }`.
- **Alternatively**: Store the key at runtime via `chrome.storage.session` or prompt the user once in an options page and save it securely.
- **Implement Background Service Worker**: Use `background.js` to house the `sendOpenAIRequest` function.
- **Grant host_permissions**: Add `https://api.openai.com/*` in `manifest.json`.
- **Refactor generateCommentAPI**: In `content.js`, send a message to the background worker with `{ postContent, tone, hint }`.
- **Implement sendOpenAIRequest**: In `background.js`, build and dispatch the `fetch` call.
- **Enhance Response Handling**: Parse JSON, check for `response.ok`, extract `choices[0].message.content`, and handle errors (e.g., rate limits, invalid JSON).
- **Add Security Note**: Advise against shipping the API key in production; recommend using a proxy server or implementing OAuth flows for user-based authentication.

## 3. OpenAI API Integration Documentation

Below is a ready-to-use function signature and example for calling the Chat Completions API from a background script (`background.js`):

```javascript
// background.js

/**
 * Sends a chat completion request to OpenAI.
 *
 * @param {Array<Object>} messages - Array of message objects, e.g.:
 *   [{ role: 'system', content: 'You are a helpful assistant.' },
 *    { role: 'user', content: prompt }]
 * @param {string} model - The model to use, e.g. 'gpt-3.5-turbo'.
 * @param {number} [temperature=0.7] - Sampling temperature 0–2.
 * @param {number} [maxTokens=150] - Maximum number of tokens to generate.
 * @returns {Promise<string>} - The assistant's reply content.
 */
async function sendOpenAIRequest({
  messages,
  model = 'gpt-3.5-turbo',
  temperature = 0.7,
  maxTokens = 150
}) {
  const apiKey = chrome.runtime.getManifest().env.OPENAI_API_KEY;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} ${err.error?.message || ''}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

**Endpoint**: `https://api.openai.com/v1/chat/completions`

**Headers**:

- `Authorization: Bearer YOUR_API_KEY`
- `Content-Type: application/json`

**Request Body Parameters**:

- `model` (string): e.g. "gpt-3.5-turbo" or "gpt-4"
- `messages` (array): Sequence of `{ role, content }`
- `temperature` (number, optional): Sampling temperature
- `max_tokens` (integer, optional): Limits generated tokens

### Integrating with `content.js`

```javascript
// content.js
document.getElementById('generate-comment-btn').addEventListener('click', async () => {
  const postContent = extractPostContent(); // your existing logic
  const tone = getSelectedTone();
  const hint = getUserHint();
  const messages = [
    { role: 'system', content: 'You are a LinkedIn comment assistant.' },
    { role: 'user', content: `Post: ${postContent}\nTone: ${tone}\nHint: ${hint}` }
  ];

  // Send to background for processing
  chrome.runtime.sendMessage(
    { action: 'generateComment', payload: { messages } },
    (reply) => {
      if (reply.error) {
        console.error(reply.error);
        alert('Failed to generate comment.');
      } else {
        insertComment(reply.comment);
      }
    }
  );
});
```

And in `background.js` you’d handle the message:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'generateComment') {
    sendOpenAIRequest(message.payload)
      .then((comment) => sendResponse({ comment }))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // keep the message channel open for async reply
  }
});
```

## 4. Security Best Practices

- **Avoid Hard-Coding Keys**: Use `manifest.json`’s "env" block for development and a secure vault or proxy backend for production.
- **Leverage Chrome Storage**: Prompt the user once for their key via an options page and save with `chrome.storage.session.set({ openaiKey })`.
- **Least Privilege**: Only request permissions for `https://api.openai.com/*` and the `storage` API.

By following this revised plan and the above documentation, you’ll have a clear, secure, and maintainable integration of ChatGPT’s API into your LinkedIn Comment Generator extension.