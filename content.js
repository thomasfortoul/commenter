/**
 * LinkedIn Comment Generator
 * Debug logging utility with production-ready configuration
 */
const debug = {
    // Control whether logs should be shown (defaults to false in production)
    enabled: false,
    // Control whether debug mode is active
    isDebugMode: false,

    /**
     * Log informational messages if debugging is enabled
     * @param {string} message - Message to log
     * @param {any} data - Optional data to include
     */
    log: (message, data = null) => {
        if (!debug.enabled && !debug.isDebugMode) return;
        console.log(`[LinkedIn Comment Generator] ${message}`, data || '');
    },

    /**
     * Log error messages (these will always show in console)
     * @param {string} message - Error message
     * @param {Error} error - Optional error object
     */
    error: (message, error = null) => {
        console.error(`[LinkedIn Comment Generator] ${message}`, error || '');
    },

    /**
     * Show visual feedback element (only in debug mode)
     * @param {string} message - Message to display
     * @param {HTMLElement} element - Optional element to highlight
     * @param {string} type - Message type (info, error, success, warning)
     */
    showVisualFeedback: (message, element = null, type = 'info') => {
        if (!debug.isDebugMode) return;

        // Create visual feedback element
        const feedback = document.createElement('div');
        feedback.className = 'lcg-debug-feedback';
        feedback.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 9999;
            max-width: 400px;
            font-size: 14px;
            font-family: Arial, sans-serif;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `;

        // Set style based on message type
        switch (type) {
            case 'error':
                feedback.style.backgroundColor = '#f44336';
                feedback.style.color = 'white';
                break;
            case 'success':
                feedback.style.backgroundColor = '#4CAF50';
                feedback.style.color = 'white';
                break;
            case 'warning':
                feedback.style.backgroundColor = '#FF9800';
                feedback.style.color = 'white';
                break;
            default:
                feedback.style.backgroundColor = '#2196F3';
                feedback.style.color = 'white';
        }

        feedback.textContent = message;

        // Highlight the element if provided
        if (element && element instanceof HTMLElement) {
            const originalOutline = element.style.outline;
            const originalZIndex = element.style.zIndex;

            element.style.outline = type === 'error' ? '3px solid #f44336' : '3px solid #2196F3';
            element.style.zIndex = '10000';

            // Restore original styles after a delay
            setTimeout(() => {
                element.style.outline = originalOutline;
                element.style.zIndex = originalZIndex;
            }, 5000);
        }

        // Add feedback to page
        document.body.appendChild(feedback);

        // Remove after 5 seconds
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => feedback.remove(), 300);
        }, 5000);
    },

    /**
     * Toggle debug mode on/off with keyboard shortcut
     * @returns {boolean} New debug mode state
     */
    toggleDebugMode: () => {
        debug.isDebugMode = !debug.isDebugMode;
        debug.enabled = debug.isDebugMode;

        if (debug.isDebugMode) {
            debug.showVisualFeedback('Debug mode activated! Press Ctrl+Shift+D to deactivate', null, 'success');
        }

        return debug.isDebugMode;
    }
};

/**
 * Retrieves information about the currently logged-in LinkedIn user
 * 
 * @returns {Promise<Object>} User information including id, name, email, and profileUrl
 */
async function getUserInfo() {
    try {
        const userInfo = {
            id: null,
            email: null,
            name: null,
            profileUrl: null
        };

        // Method 1: Get from global nav element (works on all LinkedIn pages including feed)
        const globalNav = document.getElementById('global-nav');
        if (globalNav) {
            // Try to find the profile nav item
            const profileNavItem = globalNav.querySelector('a[href*="/in/"], a[data-control-name="identity_profile_photo"]');
            if (profileNavItem) {
                userInfo.profileUrl = profileNavItem.href;
                if (userInfo.profileUrl) {
                    const idMatch = userInfo.profileUrl.match(/\/in\/([^\/]+)/);
                    if (idMatch) {
                        userInfo.id = idMatch[1];
                    }
                }
            }
        }

        // Generate a stable ID if we don't have one yet
        if (!userInfo.id) {
            // Use a hash of the navigator properties to create a device fingerprint
            const deviceInfo = `${navigator.userAgent}|${navigator.language}|${navigator.platform}|${screen.width}x${screen.height}`;
            const deviceHash = Array.from(deviceInfo).reduce((hash, char) =>
                ((hash << 5) - hash) + char.charCodeAt(0), 0).toString(36).replace('-', '');

            userInfo.id = `user_${deviceHash}`;
        }

        debug.log('Retrieved user info', userInfo);
        return userInfo;
    } catch (error) {
        debug.error('Error getting user info', error);
        // Return fallback user info with a random ID
        return {
            id: `user_${Math.random().toString(36).substring(2, 15)}`,
            email: 'unknown',
            name: 'unknown',
            profileUrl: null
        };
    }
}

// Fallback local comment generation
function generateCommentLocally(postContent, hint) {
    const templates = [
        "This is a great point about {content}! {hint_text}I've found that engaging with these ideas can lead to valuable insights.",
        "Really appreciate you sharing this perspective on {content}. {hint_text}It's given me something to think about.",
        "Interesting take on {content}! {hint_text}Thanks for sharing these thoughts with the community.",
        "I found this quite insightful, especially regarding {content}. {hint_text}Looking forward to more of your content on this topic.",
        "Thanks for highlighting these points about {content}. {hint_text}It's an important conversation to have."
    ];

    // Select a random template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Prepare a shortened version of the content
    const shortContent = postContent.length > 30
        ? postContent.substring(0, 30) + "..."
        : postContent;

    // Format the hint text if present
    const hintText = hint ? `(${hint}) ` : '';

    // Generate the comment using the template
    return template
        .replace('{content}', shortContent)
        .replace('{hint_text}', hintText);
}

// Track which posts have been processed
let processedPostIds = new Set(); // Use post IDs instead of objects

// Function to get a unique ID for a post
function getPostId(post) {
    // Try to get data-urn attribute which is typically unique for posts
    const urn = post.getAttribute('data-urn');
    if (urn) return `urn-${urn}`;

    // If no urn, try to find an id attribute
    const id = post.id;
    if (id) return `id-${id}`;

    // Try to find any unique content
    const uniqueText = extractPostContent(post).slice(0, 40).replace(/\s+/g, '-');
    if (uniqueText && uniqueText !== 'LinkedIn-post') {
        return `content-${uniqueText}`;
    }

    // As a fallback, use a combination of classList and position in document
    const postIndex = Array.from(document.querySelectorAll('.feed-shared-update-v2, .occludable-update')).indexOf(post);
    return `post-${post.classList.toString()}-${postIndex}`;
}

// Check if a post has meaningful content/caption
function hasContent(post) {
    // Look for text content with minimum length
    const minContentLength = 20; // Minimum characters to consider as meaningful content

    // Try to find text in common LinkedIn post content areas
    const contentSelectors = [
        '.feed-shared-update-v2__description-wrapper',
        '.feed-shared-text__text-view',
        '.update-components-text',
        '.feed-shared-inline-show-more-text',
        '.feed-shared-text-view',
        '.feed-shared-actor__description',
        '.update-components-actor__description',
        '.update-components-article__title',
        '.update-components-article__description',
        '.feed-shared-external-video__description',
        '.feed-shared-update-v2__commentary'
    ];

    for (const selector of contentSelectors) {
        const elements = post.querySelectorAll(selector);
        for (const element of elements) {
            const text = element.textContent.trim();
            if (text.length >= minContentLength) {
                return true;
            }
        }
    }

    // Also check for posts with images or videos (they might not have text but are still commentable)
    const mediaSelectors = [
        'img.feed-shared-image',
        '.feed-shared-image__container',
        '.feed-shared-linkedin-video',
        '.feed-shared-external-video',
        '.feed-shared-mini-article',
        '.feed-shared-article__preview-image'
    ];

    for (const selector of mediaSelectors) {
        if (post.querySelector(selector)) {
            return true;
        }
    }

    return false;
}

// Simple function to extract content from a post
function extractPostContent(post) {
    debug.log('Extracting content from post', post);

    // Try to find the main post content using more specific LinkedIn selectors first
    const contentSelectors = [
        '.feed-shared-update-v2__description-wrapper',
        '.feed-shared-text__text-view',
        '.update-components-text',
        '.feed-shared-inline-show-more-text',
        '.feed-shared-text-view',
        '.feed-shared-update-v2__commentary',
        '.update-components-article__title',
        '.update-components-article__description',
        '.feed-shared-external-video__description'
    ];

    // Try each selector to find content
    for (const selector of contentSelectors) {
        const elements = post.querySelectorAll(selector);
        for (const element of elements) {
            const text = element.textContent.trim();
            if (text.length > 10) { // More permissive length check
                debug.log('Found post content using selector', { selector, text });
                return text;
            }
        }
    }

    // Fallback: Look for any text content with reasonable length
    debug.log('Falling back to generic content extraction');
    const textElements = post.querySelectorAll('span, p, div');
    let content = '';

    for (const element of textElements) {
        const text = element.textContent.trim();
        // More permissive check - don't exclude elements with children
        if (text.length > 30) {
            content = text;
            debug.log('Found content through fallback method', content);
            break;
        }
    }

    if (!content) {
        debug.log('No suitable content found in post, using default text');
        return 'LinkedIn post';
    }

    return content;
}

// Check if a post is commentable (has comment functionality)
function isCommentable(post) {
    // Check for the presence of a comment button
    const commentButtonSelectors = [
        'button[aria-label*="comment" i]',
        'button.comment-button',
        '[aria-label*="Comment" i][role="button"]',
        '.comment-button',
        '[data-control-name="comment"]'
    ];

    for (const selector of commentButtonSelectors) {
        if (post.querySelector(selector)) {
            return true;
        }
    }

    // Check for the presence of a comment section
    const commentSectionSelectors = [
        '.comments-comment-box',
        '.comments-comment-texteditor',
        '.feed-shared-comment-box'
    ];

    for (const selector of commentSectionSelectors) {
        if (post.querySelector(selector)) {
            return true;
        }
    }

    // If we couldn't find any comment functionality, this post is not commentable
    return false;
}

// Create the Generate Comment button
function createGenerateButton() {
    const button = document.createElement('button');
    button.innerHTML = `<span class="button-icon">✨</span> Generate Comment`;
    button.className = 'linkedin-comment-generator-button';
    button.setAttribute('data-lcg-processed', 'true'); // Mark as processed
    button.style.cssText = `
        background-color: #0a66c2;
        color: white;
        border: none;
        border-radius: 24px;
        padding: 8px 16px;
        margin: 0 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 140px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(10,102,194,0.25);
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
    `;

    // Add additional style for the icon
    const style = document.createElement('style');
    style.textContent = `
        .linkedin-comment-generator-button .button-icon {
            display: inline-block;
            margin-right: 6px;
            font-size: 14px;
            transform: translateY(0);
            transition: transform 0.3s ease;
        }
        .linkedin-comment-generator-button:hover .button-icon {
            animation: sparkle 1.5s infinite;
        }
        @keyframes sparkle {
            0% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(15deg) scale(1.2); }
            50% { transform: rotate(0deg) scale(1); }
            75% { transform: rotate(-15deg) scale(1.2); }
            100% { transform: rotate(0deg) scale(1); }
        }
    `;
    document.head.appendChild(style);

    button.onmouseover = () => {
        button.style.backgroundColor = '#004182';
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 12px rgba(10,102,194,0.4)';
    };

    button.onmouseout = () => {
        button.style.backgroundColor = '#0a66c2';
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 2px 8px rgba(10,102,194,0.25)';
    };

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

// Find posts and add buttons
function addButtonsToPosts() {
    try {
        // Cleanup before adding new buttons
        cleanupDuplicateButtons();

        // Find LinkedIn posts with different possible selectors
        const postSelectors = [
            // Feed posts
            '.feed-shared-update-v2',
            '.occludable-update',
            // Article posts
            '.feed-shared-article',
            // Any post-like element
            '.feed-shared-update',
            '.update-components-actor',
            '.update-components-article',
            '.update-components-image',
            '.feed-shared-external-video',
            '.feed-shared-text'
        ];

        let allPosts = [];

        // Try each selector
        for (const selector of postSelectors) {
            const posts = document.querySelectorAll(selector);
            if (posts.length > 0) {
                debug.log(`Found ${posts.length} posts with selector: ${selector}`);
                allPosts = [...allPosts, ...posts];
            }
        }

        // Make posts unique
        allPosts = [...new Set(allPosts)];
        debug.log(`Processing ${allPosts.length} total posts`);

        let buttonsAdded = 0;

        // Process each post
        allPosts.forEach(post => {
            // Get a unique ID for this post
            const postId = getPostId(post);

            // Skip if already processed
            if (processedPostIds.has(postId)) return;

            // Skip if not commentable
            if (!isCommentable(post)) {
                debug.log(`Skipping post ${postId} - not commentable`);
                return;
            }

            // Skip if no content
            if (!hasContent(post)) {
                debug.log(`Skipping post ${postId} - no meaningful content`);
                return;
            }

            // Check if the button already exists somewhere in this post
            if (post.querySelector('.linkedin-comment-generator-button')) {
                processedPostIds.add(postId);
                return;
            }

            // First try to find the social actions toolbar
            const actionSelectors = [
                '.feed-shared-social-actions',
                '.social-details-social-actions',
                '.update-v2-social-actions',
                '.feed-shared-social-action-bar',
                '.artdeco-card__actions',
                '.feed-shared-social-counts'
            ];

            let actionBar = null;
            for (const selector of actionSelectors) {
                const actionBars = post.querySelectorAll(selector);
                if (actionBars.length > 0) {
                    for (const bar of actionBars) {
                        // Look for any visible action bar
                        if (bar.offsetParent !== null) {
                            actionBar = bar;
                            break;
                        }
                    }
                    if (actionBar) break;
                }
            }

            if (actionBar) {
                // Try to find a good placement
                let buttonAdded = false;

                // First try: Look for the comment button
                const commentBtn = actionBar.querySelector('button[aria-label*="comment" i], .comment-button, [role="button"]');
                if (commentBtn) {
                    // Find a parent element that might be a list item
                    let commentItem = commentBtn;
                    for (let i = 0; i < 3; i++) { // Look up to 3 levels up
                        if (commentItem.tagName === 'LI' || commentItem.getAttribute('role') === 'listitem') {
                            break;
                        }
                        if (commentItem.parentNode) {
                            commentItem = commentItem.parentNode;
                        } else {
                            break;
                        }
                    }

                    if (commentItem && commentItem.parentNode) {
                        // Create a container similar to other action buttons
                        const buttonContainer = document.createElement('li');
                        buttonContainer.className = 'linkedin-comment-generator-container';
                        buttonContainer.setAttribute('data-lcg-post-id', postId);
                        buttonContainer.style.cssText = `
                            display: inline-flex;
                            align-items: center;
                            margin: 0 4px;
                        `;

                        // Create the button
                        const button = createGenerateButton();

                        // Add button to container
                        buttonContainer.appendChild(button);

                        // Add container next to the comment button
                        const parentElement = commentItem.parentNode;
                        parentElement.appendChild(buttonContainer);

                        processedPostIds.add(postId);
                        buttonAdded = true;
                        buttonsAdded++;
                        debug.log(`Added button to post ${postId} next to comment button`);
                    }
                }

                // Second try: Just append to the action bar
                if (!buttonAdded) {
                    // Create a direct button container
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'linkedin-comment-generator-container';
                    buttonContainer.setAttribute('data-lcg-post-id', postId);
                    buttonContainer.style.cssText = `
                        display: inline-flex;
                        align-items: center;
                        margin: 0 8px;
                    `;

                    // Create the button
                    const button = createGenerateButton();

                    // Add button to container
                    buttonContainer.appendChild(button);

                    // Append to action bar
                    actionBar.appendChild(buttonContainer);

                    processedPostIds.add(postId);
                    buttonAdded = true;
                    buttonsAdded++;
                    debug.log(`Added button to post ${postId} directly to action bar`);
                }

                if (buttonAdded) {
                    // Skip the fallback button placement
                    processedPostIds.add(postId);
                    return;
                }
            }

            // Fallback placement: Add to the bottom of the post
            const button = createGenerateButton();

            // Make it full width for the fallback case
            button.style.display = 'block';
            button.style.width = 'calc(100% - 32px)';
            button.style.margin = '12px auto';
            button.style.padding = '8px 16px';

            // Create a container for our fallback button
            const container = document.createElement('div');
            container.className = 'linkedin-comment-generator-fallback';
            container.setAttribute('data-lcg-post-id', postId);
            container.style.cssText = `
                padding: 0 16px;
                margin: 8px 0;
            `;
            container.appendChild(button);

            // Add to the post
            post.appendChild(container);
            processedPostIds.add(postId);
            buttonsAdded++;
            debug.log(`Added fallback button to post ${postId}`);
        });

        debug.log(`Added ${buttonsAdded} buttons in total`);
    } catch (error) {
        debug.error('Error adding buttons', error);
    }
}

// Clean up any duplicate buttons
function cleanupDuplicateButtons() {
    try {
        // Get all buttons
        const buttons = document.querySelectorAll('.linkedin-comment-generator-button');
        debug.log(`Found ${buttons.length} total buttons during cleanup`);

        const buttonsByPost = new Map();

        // Group buttons by their parent post
        buttons.forEach(button => {
            const post = button.closest('.feed-shared-update-v2, .occludable-update, [data-urn], .feed-shared-update, .artdeco-card');
            if (!post) return;

            const postId = getPostId(post);
            if (!buttonsByPost.has(postId)) {
                buttonsByPost.set(postId, []);
            }
            buttonsByPost.get(postId).push(button);
        });

        // For each post, keep only the first button
        buttonsByPost.forEach((buttonsArray, postId) => {
            if (buttonsArray.length > 1) {
                debug.log(`Found ${buttonsArray.length} buttons for post ${postId}, removing duplicates`);
                // Keep the first button, remove the rest
                for (let i = 1; i < buttonsArray.length; i++) {
                    // Remove the parent container if it has our class
                    const container = buttonsArray[i].closest('.linkedin-comment-generator-container, .linkedin-comment-generator-fallback');
                    if (container) {
                        container.remove();
                    } else {
                        buttonsArray[i].remove();
                    }
                }
            }
        });

        // Remove buttons from non-commentable or content-less posts
        const allButtons = document.querySelectorAll('.linkedin-comment-generator-button');
        allButtons.forEach(button => {
            const post = button.closest('.feed-shared-update-v2, .occludable-update, [data-urn], .feed-shared-update, .artdeco-card');
            if (post) {
                if (!isCommentable(post)) {
                    const container = button.closest('.linkedin-comment-generator-container, .linkedin-comment-generator-fallback');
                    if (container) {
                        container.remove();
                    } else {
                        button.remove();
                    }
                    debug.log(`Removed button from non-commentable post`);
                }
                else if (!hasContent(post)) {
                    const container = button.closest('.linkedin-comment-generator-container, .linkedin-comment-generator-fallback');
                    if (container) {
                        container.remove();
                    } else {
                        button.remove();
                    }
                    debug.log(`Removed button from post without meaningful content`);
                }
            }
        });
    } catch (error) {
        debug.error('Error cleaning up duplicate buttons', error);
    }
}/
    / Add this new function for a reliable direct method of comment insertion
async function forceCommentInsertion(comment) {
    debug.log('Attempting FORCE comment insertion method');
    if (debug.isDebugMode) debug.showVisualFeedback('Starting FORCE comment insertion', null, 'info');

    try {
        // Step 1: Find and click the comment button first
        const commentButtonSelectors = [
            'button[aria-label*="comment"]',
            'button.comment-button',
            '.comment-button',
            '[aria-label*="Comment"]',
            '[data-control-name="comment"]',
            'button[aria-label*="Add a comment"]',
            '[role="button"][aria-label*="comment"]'
        ];

        let commentButton = null;
        for (const selector of commentButtonSelectors) {
            const buttons = document.querySelectorAll(selector);
            for (const button of buttons) {
                // Check if button is visible
                if (button.offsetParent !== null) {
                    commentButton = button;
                    if (debug.isDebugMode) debug.showVisualFeedback(`Found comment button with selector: ${selector}`, button, 'success');
                    break;
                }
            }
            if (commentButton) break;
        }

        if (commentButton) {
            debug.log('Found comment button, clicking it');
            commentButton.click();
            // Wait for comment box to appear
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            if (debug.isDebugMode) debug.showVisualFeedback('No comment button found!', null, 'error');
        }

        // Step 2: Find the comment input box
        const commentBoxSelectors = [
            'div[contenteditable="true"]',
            'div[role="textbox"]',
            'div.comments-comment-box-comment__text-editor',
            'div.ql-editor',
            'div[data-placeholder="Add a comment…"]',
            '[aria-label*="comment" i][contenteditable="true"]',
            '[aria-label*="Comment" i][role="textbox"]',
            'div.comments-comment-box__content-editor',
            'div.editor-content',
            'p[data-placeholder="Add a comment…"]',
            '[data-test-id*="comment-box"]'
        ];

        let commentBox = null;
        let usedSelector = '';
        for (const selector of commentBoxSelectors) {
            const elements = document.querySelectorAll(selector);

            for (const element of elements) {
                if (element.offsetParent !== null) { // Check if element is visible
                    commentBox = element;
                    usedSelector = selector;
                    debug.log('Found comment box', element);
                    if (debug.isDebugMode) debug.showVisualFeedback(`Found comment box with selector: ${selector}`, element, 'success');
                    break;
                }
            }
            if (commentBox) break;
        }

        if (!commentBox) {
            debug.error('Could not find comment box');
            if (debug.isDebugMode) debug.showVisualFeedback('Comment box not found!', null, 'error');
            return false;
        }

        // Step 3: Focus and clear the comment box
        commentBox.focus();
        commentBox.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        commentBox.focus();

        // Clear any existing content
        commentBox.innerHTML = '';

        // Step 4: Try multiple insertion methods
        let success = false;

        // Method 1: Clipboard paste
        try {
            debug.log('Trying clipboard paste approach');
            if (debug.isDebugMode) debug.showVisualFeedback('Trying clipboard paste approach', commentBox, 'info');

            await navigator.clipboard.writeText(comment);

            // Use keyboard shortcut to paste (Cmd+V or Ctrl+V)
            const isMac = navigator.platform.indexOf('Mac') !== -1;
            const metaKey = isMac ? true : false;
            const ctrlKey = !isMac;

            commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'v',
                code: 'KeyV',
                ctrlKey: ctrlKey,
                metaKey: metaKey,
                bubbles: true
            }));

            // Also try execCommand as backup
            document.execCommand('paste');

            await new Promise(resolve => setTimeout(resolve, 300));

            // Check if paste worked
            if (commentBox.textContent || commentBox.innerText) {
                success = true;
                if (debug.isDebugMode) debug.showVisualFeedback('Clipboard paste successful!', commentBox, 'success');
            }
        } catch (clipboardError) {
            debug.error('Clipboard paste failed', clipboardError);
        }

        // Method 2: Direct text insertion
        if (!success) {
            try {
                debug.log('Trying direct text insertion');
                if (debug.isDebugMode) debug.showVisualFeedback('Trying direct text insertion', commentBox, 'info');

                commentBox.textContent = comment;

                if (!commentBox.textContent) {
                    commentBox.innerText = comment;
                }

                if (!commentBox.textContent && !commentBox.innerText) {
                    const textNode = document.createTextNode(comment);
                    commentBox.appendChild(textNode);
                }

                // Check if direct insertion worked
                if (commentBox.textContent || commentBox.innerText) {
                    success = true;
                    if (debug.isDebugMode) debug.showVisualFeedback('Direct text insertion successful!', commentBox, 'success');
                }
            } catch (textError) {
                debug.error('Direct text insertion failed', textError);
            }
        }

        // Method 3: InputEvent simulation
        if (!success) {
            try {
                debug.log('Trying InputEvent simulation');
                if (debug.isDebugMode) debug.showVisualFeedback('Trying InputEvent simulation', commentBox, 'info');

                // Clear content again to be safe
                commentBox.innerHTML = '';

                // Use modern InputEvent to simulate typing
                commentBox.dispatchEvent(new InputEvent('input', {
                    inputType: 'insertText',
                    data: comment,
                    bubbles: true,
                    cancelable: true
                }));

                // Check if input event approach worked
                if (commentBox.textContent || commentBox.innerText) {
                    success = true;
                    if (debug.isDebugMode) debug.showVisualFeedback('InputEvent simulation successful!', commentBox, 'success');
                } else {
                    // Try execCommand as last resort
                    document.execCommand('insertText', false, comment);

                    if (commentBox.textContent || commentBox.innerText) {
                        success = true;
                        if (debug.isDebugMode) debug.showVisualFeedback('execCommand insertText successful!', commentBox, 'success');
                    }
                }
            } catch (inputError) {
                debug.error('InputEvent simulation failed', inputError);
            }
        }

        // Step 5: Trigger change events to notify LinkedIn
        if (success) {
            // Trigger various events that LinkedIn might be listening for
            commentBox.dispatchEvent(new Event('input', { bubbles: true }));
            commentBox.dispatchEvent(new Event('change', { bubbles: true }));
            commentBox.dispatchEvent(new Event('keyup', { bubbles: true }));

            debug.log('Comment insertion successful');
            if (debug.isDebugMode) debug.showVisualFeedback('Comment successfully inserted!', commentBox, 'success');
            return true;
        } else {
            debug.error('All comment insertion methods failed');
            if (debug.isDebugMode) debug.showVisualFeedback('All insertion methods failed', null, 'error');
            return false;
        }

    } catch (error) {
        debug.error('Error in forceCommentInsertion', error);
        if (debug.isDebugMode) debug.showVisualFeedback(`Insertion error: ${error.message}`, null, 'error');
        return false;
    }
}

// Initialize the extension when the page loads
function initializeExtension() {
    debug.log('Initializing LinkedIn Comment Generator extension');

    // Add buttons to existing posts
    addButtonsToPosts();

    // Set up observer for new posts
    const observer = new MutationObserver((mutations) => {
        let shouldAddButtons = false;

        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if new posts were added
                        if (node.matches && (
                            node.matches('.feed-shared-update-v2') ||
                            node.matches('.occludable-update') ||
                            node.querySelector('.feed-shared-update-v2') ||
                            node.querySelector('.occludable-update')
                        )) {
                            shouldAddButtons = true;
                        }
                    }
                });
            }
        });

        if (shouldAddButtons) {
            // Debounce the button addition
            clearTimeout(window.addButtonsTimeout);
            window.addButtonsTimeout = setTimeout(() => {
                addButtonsToPosts();
            }, 1000);
        }
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Periodically check for new posts (fallback)
    setInterval(() => {
        addButtonsToPosts();
    }, 5000);

    debug.log('Extension initialized successfully');
}

// Wait for the page to load, then initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}

// Also initialize when the page becomes visible (for single-page app navigation)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setTimeout(addButtonsToPosts, 1000);
    }
});

// Add keyboard shortcut for debug mode
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        debug.toggleDebugMode();
    }
});

debug.log('LinkedIn Comment Generator content script loaded');