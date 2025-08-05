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
 * Get the appropriate system prompt based on the prompt type
 * @param {string} promptType - The type of prompt (controversial, friendly, question, funny, casual, or default)
 * @returns {string} The system prompt
 */
function getSystemPrompt(promptType) {
  switch (promptType) {
    case 'controversial':
      return `
Write short contrarian comments. Use simple words. Short sentences with good spacing.

Examples:
"Great operators are valuable, yes. But it's easy to overemphasize their role."
"This sounds good in theory. In practice, it rarely works out."
"I see the appeal here. But we tried this approach and it backfired."

Write one simple disagreement:
`;

    case 'friendly':
      return `
Write supportive, professional LinkedIn comments that encourage or congratulate. Be warm but business-appropriate.

Examples:
"Congrats on the milestone! Well-deserved success."
"Love seeing this kind of innovation in the space."
"Great insights here - thanks for sharing your experience."
"This is exactly the leadership we need more of."
"Impressive results! Looking forward to seeing what's next."

Write one encouraging, professional comment:
`;

    case 'question':
      return `
Acknowledge the post with a super quick, punchy sentence (a few words max), then ask a casual question. Use simple, everyday language with natural spacing.

Examples:
"yeah, makes sense. how did you handle the scaling challenges?"
"true. what made you pivot from the original strategy?"
"got it. any plans to expand this to other markets?"
"interesting. which part surprised you most?"
"totally. how long did it take to see these results?"

Write one casual question with a quick acknowledgment:
`;

    case 'funny':
      return `
write super short funny comments. one line max. all lowercase. no punctuation. super casual language. very brief.

examples:
"ops game so smooth even nasa's asking for tips"
"my guy's about to poach all of mark's engineers back"
"marketing students in shambles rn"
"plot twist it was all just really good coffee"
"someone's about to become everyone's favorite person"

write one funny casual comment:
`;

    case 'casual':
      return `
Write super casual, lowercase comments. One line max. No punctuation. Simple language.

Examples:
"gotta get to nyc"
"gonna start using this"
"hadnt thought about it that way"
"this hits close to home"
"stealing this approach"
"time to update my resume"
"need to try this"
"so relatable"

Write one super casual lowercase reaction:
`;

    default:
      return `
Write casual LinkedIn comments with a bit of personality. No corporate buzzwords. No rhetorical questions. Make statements that add value or show genuine reaction.

Examples:
"This is brutal but so accurate."
"Marketing teams everywhere just panicked."
"That's massive!"
"Bravo!"
"About to steal all the good engineers."
"$150k MRR in month one is wild."
"Finally someone said it."

Write one comment matching this tone under 15 words.
`;
  }
}

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
  postContent,
  promptType = 'default'
}) {
  const model = 'gpt-4.1-nano';
  const messages = [
    {
      role: 'system',
      content: getSystemPrompt(promptType)
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
      'Authorization': `Bearer ${API_KEY}`,
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