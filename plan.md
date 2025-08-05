# Plan: Direct Comment Insertion

This plan outlines the necessary changes to modify the LinkedIn Comment Generator extension. The goal is to replace the current modal-based UI with a direct "Generate" button that inserts the comment into the LinkedIn comment box.

## 1. Update `background.js`

The `background.js` script will be updated to use a new, hardcoded prompt and the `gpt-4.1-nano` model.

### Changes:

- **Modify `sendOpenAIRequest` function:**
  - The `messages` parameter will be replaced with a hardcoded prompt structure.
  - The `model` will be set to `gpt-4.1-nano` by default.
  - The function will only need the `postContent` as a parameter.

```javascript
// background.js

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
```

## 2. Modify `content.js`

The `content.js` script will be significantly simplified. The modal UI will be removed, and the "Generate" button will trigger the new direct insertion workflow.

### Changes:

- **Remove `createCommentUI` function:** The entire `createCommentUI` function will be deleted.
- **Remove tone and model dropdowns:** All code related to the tone and model selection UI will be removed.
- **Update `createGenerateButton`:** The event listener for the "Generate" button will be updated to call a new `handleGenerateClick` function.
- **Create `handleGenerateClick` function:** This new function will orchestrate the comment generation and insertion.

```javascript
// content.js

// ... (keep existing functions like getPostId, hasContent, extractPostContent, etc.)

// This function will be removed
// function createCommentUI(post, generateButton) { ... }

function createGenerateButton() {
    const button = document.createElement('button');
    // ... (button styling remains the same)

    button.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const post = e.target.closest('.feed-shared-update-v2, .occludable-update');
        if (post) {
            await handleGenerateClick(post);
        }
    });

    return button;
}

async function handleGenerateClick(post) {
    const content = extractPostContent(post);
    
    try {
        const comment = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ 
                action: 'generateComment', 
                payload: { postContent: content } 
            }, (reply) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                }
                if (reply.error) {
                    return reject(new Error(reply.error));
                }
                resolve(reply.comment);
            });
        });

        if (comment) {
            await forceCommentInsertion(comment);
        }
    } catch (error) {
        console.error('Error generating or inserting comment:', error);
    }
}

// ... (keep addButtonsToPosts, cleanupDuplicateButtons, forceCommentInsertion, etc.)
```

## 3. Simplify `popup.html` and `popup.js`

The popup is no longer the primary interface for the extension. It will be simplified to show basic information.

### `popup.html` Changes:

The body of `popup.html` will be replaced with a simple message.

```html
<!-- popup.html -->
<body>
    <div class="container">
        <h1>LinkedIn Comment Generator</h1>
        <p>The "Generate" button is now available directly on LinkedIn posts.</p>
    </div>
    <script src="popup.js"></script>
</body>
```

### `popup.js` Changes:

The `popup.js` script will be cleared of all logic related to comment generation and UI updates.

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', function() {
    // No special logic needed for the simplified popup.
});
```

## 4. Review and Finalize

After implementing these changes, a thorough review will be conducted to ensure the new workflow is smooth and bug-free.

---

Once you approve this plan, I will request to switch to **Code mode** to implement these changes.