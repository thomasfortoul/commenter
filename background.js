/**
 * LinkedIn Comment Generator - Background Script
 * 
 * Handles extension-level functionality that requires background processing.
 */

/**
 * Logging utility for the background script
 */
const logger = {
    // Set to false in production
    enabled: false,
    
    log(message, data = null) {
        if (this.enabled) {
            console.log(`[LinkedIn Comment Generator] ${message}`, data || '');
        }
    },
    
    error(message, error = null) {
        // Always log errors
        console.error(`[LinkedIn Comment Generator] ${message}`, error || '');
    }
};

/**
 * Listen for messages from content script or popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.log('Received message', request);

  try {
    if (request.action === 'generateComment') {
      sendOpenAIRequest(request.payload)
        .then((comment) => sendResponse({ comment }))
        .catch((error) => sendResponse({ error: error.message }));
    } else if (request.action === 'checkPermissions') {
      // Check for required permissions
      logger.log('Checking extension permissions');

      checkClipboardPermission()
        .then(result => sendResponse(result))
        .catch(error => {
          logger.error('Error checking permissions', error);
          sendResponse({
            success: false,
            error: error.message
          });
        });
    } else if (request.action === 'getExtensionInfo') {
      // Return basic extension information
      sendResponse({
        success: true,
        version: chrome.runtime.getManifest().version,
        name: chrome.runtime.getManifest().name
      });
    }
  } catch (error) {
    logger.error('Error handling message', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }

  return true; // Keep the message channel open for async response
});

/**
 * Check clipboard permission
 * @returns {Promise<Object>} Result of the permission check
 */
async function checkClipboardPermission() {
    try {
        // Try to write to clipboard as a test
        const testText = "Test clipboard permission";
        await navigator.clipboard.writeText(testText);
        logger.log('Clipboard permission granted');
        return { success: true };
    } catch (error) {
        logger.error('Clipboard permission denied', error);
        return { 
            success: false, 
            error: 'Clipboard access is required for copying comments.' 
        };
    }
}

/**
 * Listen for extension installation or update
 */
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        logger.log('Extension installed');
    } else if (details.reason === 'update') {
        logger.log('Extension updated', { 
            previousVersion: details.previousVersion,
            currentVersion: chrome.runtime.getManifest().version
        });
    }
});

logger.log('Background script initialized'); 
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
  postContent
}) {
  const apiKey = ""; // Replace with your actual API key
  const model = 'gpt-4.1-nano';
  const messages = [
    {
      role: 'system',
      content: `
Prompt:
You are a LinkedIn comment generator that writes in a casual, slightly irreverent style. Use short, punchy sentences. No fancy em dashes - use hyphens or commas. Never too formal, never cliché, taboo-free. Skip buzzwords like transformative, leverage, synergy, innovative, paradigm, next-level. Avoid filler phrases like Certainly, Of course, I’m happy to. Keep under 15 words. Add light wit or value.

Examples of tone & style:
“Brutal reality check, I’ll pass for now lol”
“Marketing students in shambles rn.”
“That’s massive!”
“Bravo!”
“My guy’s about to poach all of Mark’s engineers back”
“$150k MRR = one $150k all-in a month, easy.”

Instruction:
Given the LinkedIn post below, write one comment matching the tone above.
`
    },
    {
      role: 'user',
      content: `
LinkedIn post:
${postContent}

Your comment:
`
    }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 150
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} ${err.error?.message || ''}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}