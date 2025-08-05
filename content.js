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
 * API configuration for comment generation service
 */
const API_CONFIG = {
    /**
     * API endpoint for generating comments
     * This should be updated to your production endpoint
     */
    URL: 'https://n8n.srv894857.hstgr.cloud/webhook/linkedin-comment',
    // URL: 'https://n8n.srv894857.hstgr.cloud/webhook-test/linkedin-comment',
    
    /**
     * Maximum number of retries for API calls
     */
    MAX_RETRIES: 2,
    
    /**
     * Default timeout for API calls in milliseconds
     */
    TIMEOUT_MS: 10000
};

/**
 * GPT model configuration and mapping
 */
const GPT_MODELS = {
    /**
     * Available GPT models with their display names and API identifiers
     */
    MODELS: [
        { value: 'gpt-4.1', label: 'GPT-4.1 🧠', apiName: 'gpt-4.1' },
        { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini 🌟', apiName: 'gpt-4.1-mini' },
        { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano ⚡', apiName: 'gpt-4.1-nano' },
        { value: 'gpt-4o', label: 'GPT-4o 🚀', apiName: 'gpt-4o' },
        { value: 'o3-mini', label: 'O3 Mini 🚀', apiName: 'o3-mini' },
        { value: 'o4-mini', label: 'O4 Mini 🚀', apiName: 'o4-mini' }
    ],
    
    /**
     * Get API name for a given model value
     * @param {string} modelValue - The model value from dropdown
     * @returns {string} The corresponding API model name
     */
    getApiName: function(modelValue) {
        const model = this.MODELS.find(m => m.value === modelValue);
        return model ? model.apiName : 'gpt-4.1-nano'; // Default to GPT-4 if not found
    },
    
    /**
     * Get display label for a given model value
     * @param {string} modelValue - The model value from dropdown
     * @returns {string} The display label
     */
    getDisplayLabel: function(modelValue) {
        const model = this.MODELS.find(m => m.value === modelValue);
        return model ? model.label : 'GPT-4.1 Nano ⚡'; // Default to GPT-4 if not found
    }
};

/**
 * Generates a comment by calling the API with post content, hint, tone, and model
 * 
 * @param {string} content - The content of the post to generate a comment for
 * @param {string} hint - Optional hint to guide comment generation
 * @param {string} tone - Optional tone for the comment (professional, friendly, etc.)
 * @param {string} model - Optional GPT model to use for generation
 * @returns {Promise<string>} The generated comment
 * @throws {Error} If API call fails or response is invalid
 */
async function generateCommentAPI(content, hint, tone, model) {
    if (!API_CONFIG.URL) {
        throw new Error('API endpoint not configured in code.');
    }
    
    // Get user info from LinkedIn
    const userInfo = await getUserInfo();
    
    // Get post ID more reliably
    let postId = 'unknown';
    try {
        // Try to find the post element in various ways
        const postElement = document.querySelector('.feed-shared-update-v2, .occludable-update, [data-urn]') ||
                          document.activeElement?.closest('.feed-shared-update-v2, .occludable-update, [data-urn]');
        
        if (postElement) {
            // Try different ways to get the post ID
            postId = postElement.getAttribute('data-urn') || 
                    postElement.getAttribute('data-id') || 
                    postElement.id || 
                    'unknown';
        }
    } catch (error) {
        debug.error('Error getting post ID', error);
    }
    
    // Create unique_id by combining profile URL and post ID
    const uniqueId = userInfo.profileUrl ? 
        `${userInfo.profileUrl}_${postId}` : 
        `${userInfo.id || 'unknown'}_${postId}`;
    
    // Prepare the request payload
    const payload = {
        hint: hint || "",
        caption: content,
        tone: tone || "professional",
        model: GPT_MODELS.getApiName(model || "gpt-4.1-nano"),
        unique_id: uniqueId,
        user_info: {
            id: userInfo.id || 'unknown',
            email: userInfo.email || 'unknown',
            name: userInfo.name || 'unknown',
            profile_url: userInfo.profileUrl || 'unknown'
        }
    };
    
    debug.log('Sending payload to API', payload);
    
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    };
    
    try {
        let retries = 0;
        let response;
        
        // Retry logic with exponential backoff
        while (retries <= API_CONFIG.MAX_RETRIES) {
            try {
                debug.log(`API call attempt ${retries + 1}/${API_CONFIG.MAX_RETRIES + 1}`);
                
                // Use AbortController to implement timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
                
                response = await fetch(API_CONFIG.URL, {
                    ...requestOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                break;
            } catch (error) {
                retries++;
                if (retries > API_CONFIG.MAX_RETRIES) {
                    throw error.name === 'AbortError' 
                        ? new Error('API request timed out') 
                        : error;
                }
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
            }
        }
        
        if (!response.ok) {
            let errorMessage = `API error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage += ` - ${JSON.stringify(errorData)}`;
            } catch (e) {
                // If we can't parse JSON, just use status text
                errorMessage += ` - ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (!data.comment) {
            throw new Error('API response missing comment field');
        }
        
        return data.comment;
    } catch (error) {
        debug.error('Error calling comment generation API', error);
        throw error;
    }
}

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

        // Method 2: Get from the Me dropdown menu
        if (!userInfo.profileUrl) {
            const meMenu = document.querySelector('button[aria-label="Me"], button[data-control-name="nav.settings_dropdown"]');
            if (meMenu) {
                // Click to open the menu
                meMenu.click();
                // Wait a bit for the menu to open
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Look for profile link in the dropdown
                const profileLink = document.querySelector('a[href*="/in/"][data-control-name="identity_profile_photo"], div[data-control-name="identity_welcome_message"] a');
                if (profileLink) {
                    userInfo.profileUrl = profileLink.href;
                    if (userInfo.profileUrl) {
                        const idMatch = userInfo.profileUrl.match(/\/in\/([^\/]+)/);
                        if (idMatch) {
                            userInfo.id = idMatch[1];
                        }
                    }
                }
                
                // Close the menu by clicking outside
                document.body.click();
            }
        }

        // Method 3: Get from the feed identity module
        if (!userInfo.profileUrl || !userInfo.name) {
            const feedIdentity = document.querySelector('.feed-identity-module');
            if (feedIdentity) {
                const profileLink = feedIdentity.querySelector('a[href*="/in/"]');
                if (profileLink) {
                    userInfo.profileUrl = profileLink.href;
                    if (!userInfo.name) {
                        userInfo.name = profileLink.textContent.trim();
                    }
                    
                    if (userInfo.profileUrl && !userInfo.id) {
                        const idMatch = userInfo.profileUrl.match(/\/in\/([^\/]+)/);
                        if (idMatch) {
                            userInfo.id = idMatch[1];
                        }
                    }
                }
            }
        }

        // Method 4: Get from data attributes in the DOM
        if (!userInfo.id) {
            // LinkedIn often stores member ID in data attributes
            const memberElements = document.querySelectorAll('[data-urn*="urn:li:member:"], [data-entity-urn*="urn:li:member:"]');
            for (const element of memberElements) {
                const urn = element.getAttribute('data-urn') || element.getAttribute('data-entity-urn');
                if (urn) {
                    const match = urn.match(/urn:li:member:(\d+)/);
                    if (match) {
                        userInfo.id = match[1];
                        break;
                    }
                }
            }
        }

        // Method 5: Get name from profile sections if available
        if (!userInfo.name) {
            const nameSelectors = [
                '.profile-rail-card__actor-link',
                '.feed-identity-module__actor-link',
                '.identity-headline',
                '.profile-card-one-to-one__profile-link',
                '.profile-rail-card__name',
                '.identity-name'
            ];
            
            for (const selector of nameSelectors) {
                const nameElement = document.querySelector(selector);
                if (nameElement) {
                    userInfo.name = nameElement.textContent.trim();
                    break;
                }
            }
        }

        // Method 6: Try to get from meta tags
        if (!userInfo.id || !userInfo.name) {
            const metaTags = document.querySelectorAll('meta');
            for (const meta of metaTags) {
                const content = meta.getAttribute('content');
                if (!content) continue;
                
                // Look for profile info in meta tags
                if (meta.getAttribute('name') === 'profile:first_name' || meta.getAttribute('property') === 'profile:first_name') {
                    userInfo.name = (userInfo.name || '') + ' ' + content;
                }
                if (meta.getAttribute('name') === 'profile:last_name' || meta.getAttribute('property') === 'profile:last_name') {
                    userInfo.name = (userInfo.name || '') + ' ' + content;
                }
            }
            
            if (userInfo.name) {
                userInfo.name = userInfo.name.trim();
            }
        }

        // Method 7: Check local storage for any saved user info
        if (!userInfo.id || !userInfo.profileUrl) {
            try {
                const localStorageData = JSON.parse(localStorage.getItem('linkedin-comment-generator-user-info'));
                if (localStorageData) {
                    if (!userInfo.id && localStorageData.id) {
                        userInfo.id = localStorageData.id;
                    }
                    if (!userInfo.profileUrl && localStorageData.profileUrl) {
                        userInfo.profileUrl = localStorageData.profileUrl;
                    }
                    if (!userInfo.name && localStorageData.name) {
                        userInfo.name = localStorageData.name;
                    }
                }
            } catch (e) {
                debug.log('Error reading from localStorage', e);
            }
        }

        // If we still don't have a profile URL, try to construct it from the ID
        if (!userInfo.profileUrl && userInfo.id) {
            userInfo.profileUrl = `https://www.linkedin.com/in/${userInfo.id}/`;
        }

        // Save the user info we found to localStorage for future use
        if (userInfo.id || userInfo.profileUrl) {
            try {
                localStorage.setItem('linkedin-comment-generator-user-info', JSON.stringify(userInfo));
            } catch (e) {
                debug.log('Error saving to localStorage', e);
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

// Track which posts have been processed and the active comment UI
let processedPostIds = new Set(); // Use post IDs instead of objects
let activeCommentUI = null;

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

// Create settings UI for the extension
function createSettingsUI() {
    const container = document.createElement('div');
    container.className = 'linkedin-comment-generator-settings';
    container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        background: white;
        border: 2px solid #0a66c2;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        width: 400px;
        max-width: 90vw;
    `;
    
    const heading = document.createElement('h3');
    heading.textContent = 'LinkedIn Comment Generator Settings';
    heading.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 18px;
        color: #0a66c2;
    `;
    
    const infoText = document.createElement('p');
    infoText.textContent = 'This extension is using a pre-configured API endpoint for generating comments.';
    infoText.style.cssText = `
        margin-bottom: 16px;
        font-size: 14px;
        color: #666;
    `;
    
    const formatInfo = document.createElement('div');
    formatInfo.innerHTML = `
        <p style="font-size: 12px; color: #666; margin-top: 0;">
            API request format:
            <code style="display: block; background: #f5f5f5; padding: 8px; margin: 8px 0; border-radius: 4px; font-family: monospace;">
            {
              "hint": "optional text",
              "caption": "post content text"
            }
            </code>
            
            API response format:
            <code style="display: block; background: #f5f5f5; padding: 8px; margin: 8px 0; border-radius: 4px; font-family: monospace;">
            {
              "comment": "generated comment text"
            }
            </code>
        </p>
    `;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 8px;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
        padding: 8px 16px;
        border: none;
        border-radius: 16px;
        background-color: #0a66c2;
        color: white;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
    `;
    
    closeBtn.addEventListener('click', () => {
        container.remove();
    });
    
    buttonContainer.appendChild(closeBtn);
    
    container.appendChild(heading);
    container.appendChild(infoText);
    container.appendChild(formatInfo);
    container.appendChild(buttonContainer);
    
    document.body.appendChild(container);
}

// Create a comment UI that appears when the generate button is clicked
function createCommentUI(post, generateButton) {
    const container = document.createElement('div');
    container.className = 'linkedin-comment-generator-ui';
    container.style.cssText = `
        padding: 20px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        margin: 16px 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        transition: all 0.3s ease;
        position: relative;
    `;
    
    // Create the UI elements
    const heading = document.createElement('h3');
    heading.textContent = 'Generate Comment';
    heading.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 18px;
        color: #0a66c2;
        font-weight: 600;
        letter-spacing: -0.2px;
    `;
    
    const hintInput = document.createElement('input');
    hintInput.type = 'text';
    hintInput.placeholder = 'Add Feedback to Generated comment (optional)';
    hintInput.style.cssText = `
        display: none;
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        margin-bottom: 14px;
        font-size: 15px;
        box-sizing: border-box;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        outline: none;
        font-weight: 500;
        color: #333;
        line-height: 1.2;
    `;
    
    hintInput.addEventListener('focus', () => {
        hintInput.style.borderColor = '#0a66c2';
        hintInput.style.boxShadow = '0 0 0 2px rgba(10, 102, 194, 0.2)';
    });
    
    hintInput.addEventListener('blur', () => {
        hintInput.style.borderColor = '#e0e0e0';
        hintInput.style.boxShadow = 'none';
    });

    // Add tone dropdown
    const toneContainer = document.createElement('div');
    toneContainer.className = 'linkedin-comment-generator-tone-container';
    toneContainer.style.cssText = `
        margin-bottom: 14px;
        position: relative;
        width: 100%;
    `;

    const toneLabel = document.createElement('label');
    toneLabel.textContent = 'Tone:';
    toneLabel.style.cssText = `
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
        color: #555;
        font-weight: 500;
    `;

    // Custom dropdown container
    const customDropdown = document.createElement('div');
    customDropdown.className = 'custom-dropdown';
    customDropdown.style.cssText = `
        position: relative;
        width: 100%;
    `;

    // Hidden native select element for form submission
    const toneSelect = document.createElement('select');
    toneSelect.className = 'linkedin-comment-generator-tone-select';
    toneSelect.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 1;
    `;

    // Custom display element
    const customDropdownDisplay = document.createElement('div');
    customDropdownDisplay.className = 'custom-dropdown-display';
    customDropdownDisplay.style.cssText = `
        padding: 12px 16px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        font-size: 15px;
        background-color: white;
        font-weight: 600;
        color: #000;
        line-height: 1.2;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
    `;

    // Text element inside display
    const displayText = document.createElement('span');
    displayText.className = 'dropdown-display-text';
    displayText.textContent = 'Professional 💼'; // Default value
    displayText.style.cssText = `
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    `;

    // Arrow element
    const displayArrow = document.createElement('span');
    displayArrow.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    displayArrow.style.cssText = `
        margin-left: 8px;
        display: flex;
        align-items: center;
    `;

    // Add tone options
    const tones = [
        { value: 'professional', label: 'Professional 💼' },
        { value: 'supportive', label: 'Supportive 🤝' },
        { value: 'friendly', label: 'Friendly 😊' },
        { value: 'inquisitive', label: 'Inquisitive ❓' },
        { value: 'cheerful', label: 'Cheerful 🎉' },
        { value: 'funny', label: 'Funny 😂' }
    ];

    // Add options to the native select
    tones.forEach(tone => {
        const option = document.createElement('option');
        option.value = tone.value;
        option.textContent = tone.label;
        if (tone.value === 'professional') {
            option.selected = true;
        }
        toneSelect.appendChild(option);
    });

    // Update display when select changes
    toneSelect.addEventListener('change', () => {
        const selectedOption = toneSelect.options[toneSelect.selectedIndex];
        displayText.textContent = selectedOption.textContent;
        customDropdownDisplay.style.borderColor = '#e0e0e0';
        customDropdownDisplay.style.boxShadow = 'none';
    });

    // Handle focus/blur states for custom dropdown
    toneSelect.addEventListener('focus', () => {
        customDropdownDisplay.style.borderColor = '#0a66c2';
        customDropdownDisplay.style.boxShadow = '0 0 0 2px rgba(10, 102, 194, 0.2)';
    });

    toneSelect.addEventListener('blur', () => {
        customDropdownDisplay.style.borderColor = '#e0e0e0';
        customDropdownDisplay.style.boxShadow = 'none';
    });

    // Assemble custom dropdown
    customDropdownDisplay.appendChild(displayText);
    customDropdownDisplay.appendChild(displayArrow);
    customDropdown.appendChild(customDropdownDisplay);
    customDropdown.appendChild(toneSelect);

    toneContainer.appendChild(toneLabel);
    toneContainer.appendChild(customDropdown);
    
    // Add model dropdown
    const modelContainer = document.createElement('div');
    modelContainer.className = 'linkedin-comment-generator-model-container';
    modelContainer.style.cssText = `
        margin-bottom: 14px;
        position: relative;
        width: 100%;
    `;

    const modelLabel = document.createElement('label');
    modelLabel.textContent = 'Model:';
    modelLabel.style.cssText = `
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
        color: #555;
        font-weight: 500;
    `;

    // Custom dropdown container for model
    const modelCustomDropdown = document.createElement('div');
    modelCustomDropdown.className = 'custom-dropdown';
    modelCustomDropdown.style.cssText = `
        position: relative;
        width: 100%;
    `;

    // Hidden native select element for model
    const modelSelect = document.createElement('select');
    modelSelect.className = 'linkedin-comment-generator-model-select';
    modelSelect.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 1;
    `;

    // Custom display element for model
    const modelCustomDropdownDisplay = document.createElement('div');
    modelCustomDropdownDisplay.className = 'custom-dropdown-display';
    modelCustomDropdownDisplay.style.cssText = `
        padding: 12px 16px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        font-size: 15px;
        background-color: white;
        font-weight: 600;
        color: #000;
        line-height: 1.2;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
    `;

    // Text element inside model display
    const modelDisplayText = document.createElement('span');
    modelDisplayText.className = 'dropdown-display-text';
    modelDisplayText.textContent = 'GPT-4.1 Nano ⚡'; // Default value
    modelDisplayText.style.cssText = `
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    `;

    // Arrow element for model
    const modelDisplayArrow = document.createElement('span');
    modelDisplayArrow.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    modelDisplayArrow.style.cssText = `
        margin-left: 8px;
        display: flex;
        align-items: center;
    `;

    // Add model options
    GPT_MODELS.MODELS.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.label;
        if (model.value === 'gpt-4.1-nano') {
            option.selected = true;
        }
        modelSelect.appendChild(option);
    });

    // Update display when model select changes
    modelSelect.addEventListener('change', () => {
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        modelDisplayText.textContent = selectedOption.textContent;
        modelCustomDropdownDisplay.style.borderColor = '#e0e0e0';
        modelCustomDropdownDisplay.style.boxShadow = 'none';
    });

    // Handle focus/blur states for model custom dropdown
    modelSelect.addEventListener('focus', () => {
        modelCustomDropdownDisplay.style.borderColor = '#0a66c2';
        modelCustomDropdownDisplay.style.boxShadow = '0 0 0 2px rgba(10, 102, 194, 0.2)';
    });

    modelSelect.addEventListener('blur', () => {
        modelCustomDropdownDisplay.style.borderColor = '#e0e0e0';
        modelCustomDropdownDisplay.style.boxShadow = 'none';
    });

    // Assemble model custom dropdown
    modelCustomDropdownDisplay.appendChild(modelDisplayText);
    modelCustomDropdownDisplay.appendChild(modelDisplayArrow);
    modelCustomDropdown.appendChild(modelCustomDropdownDisplay);
    modelCustomDropdown.appendChild(modelSelect);

    modelContainer.appendChild(modelLabel);
    modelContainer.appendChild(modelCustomDropdown);
    
    const commentBox = document.createElement('textarea');
    commentBox.readOnly = true;
    commentBox.placeholder = 'Generated comment will appear here...';
    commentBox.style.cssText = `
        width: 100%;
        min-height: 120px;
        padding: 16px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        font-size: 15px;
        line-height: 1.5;
        resize: vertical;
        box-sizing: border-box;
        background-color: #f9fafb;
        transition: background-color 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #333;
    `;
    
    // Create a container for the textarea and copy button
    const commentBoxContainer = document.createElement('div');
    commentBoxContainer.style.cssText = `
        position: relative;
        width: 100%;
        margin-bottom: 8px;
    `;
    
    // Add copy button
    const copyButton = document.createElement('button');
    copyButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    copyButton.title = "Copy comment to clipboard";
    copyButton.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(255, 255, 255, 0.8);
        border: none;
        border-radius: 4px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #0a66c2;
        transition: all 0.2s ease;
        opacity: 0.7;
        z-index: 1;
    `;
    
    copyButton.addEventListener('mouseover', () => {
        copyButton.style.opacity = '1';
        copyButton.style.backgroundColor = '#f0f7ff';
    });
    
    copyButton.addEventListener('mouseout', () => {
        copyButton.style.opacity = '0.7';
        copyButton.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    });
    
    copyButton.addEventListener('click', () => {
        if (!commentBox.value || commentBox.value === 'Generating comment...') return;
        
        try {
            // Copy to clipboard
            navigator.clipboard.writeText(commentBox.value).then(() => {
                // Show success feedback
                const originalInnerHTML = copyButton.innerHTML;
                copyButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                
                setTimeout(() => {
                    copyButton.innerHTML = originalInnerHTML;
                }, 2000);
            }).catch(err => {
                debug.error('Failed to copy: ', err);
                
                // Fallback method for older browsers
                commentBox.select();
                document.execCommand('copy');
                
                // Show success feedback
                const originalInnerHTML = copyButton.innerHTML;
                copyButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                
                setTimeout(() => {
                    copyButton.innerHTML = originalInnerHTML;
                }, 2000);
            });
        } catch (error) {
            debug.error('Error copying to clipboard', error);
            
            // Try one more fallback
            try {
                commentBox.select();
                document.execCommand('copy');
            } catch (e) {
                debug.error('Final copy attempt failed', e);
            }
        }
    });
    
    // Assemble the comment box container
    commentBoxContainer.appendChild(commentBox);
    commentBoxContainer.appendChild(copyButton);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        justify-content: space-between;
        gap: 12px;
    `;
    
    const regenerateBtn = document.createElement('button');
    regenerateBtn.textContent = 'Generate';
    regenerateBtn.style.cssText = `
        padding: 10px 20px;
        border: 1px solid #0a66c2;
        border-radius: 24px;
        background-color: white;
        color: #0a66c2;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        flex: 1;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        position: relative;
        overflow: hidden;
        width: 100%;
    `;
    
    regenerateBtn.addEventListener('mouseover', () => {
        regenerateBtn.style.backgroundColor = '#f0f7ff';
        regenerateBtn.style.transform = 'translateY(-1px)';
        regenerateBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    });
    
    regenerateBtn.addEventListener('mouseout', () => {
        regenerateBtn.style.backgroundColor = 'white';
        regenerateBtn.style.transform = 'translateY(0)';
        regenerateBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    });
    
    // Add note explaining about copy functionality
    const copyNote = document.createElement('div');
    copyNote.textContent = 'Use the copy button to copy the generated comment to your clipboard.';
    copyNote.style.cssText = `
        font-size: 12px;
        color: #666;
        margin-top: 8px;
        text-align: center;
        margin-bottom: 8px;
    `;

    // Create settings and close buttons
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    closeBtn.style.cssText = `
        position: absolute;
        top: 16px;
        right: 16px;
        border: none;
        background: transparent;
        color: #666;
        cursor: pointer;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
    `;
    
    closeBtn.addEventListener('mouseover', () => {
        closeBtn.style.backgroundColor = '#f0f0f0';
        closeBtn.style.color = '#f44336';
    });
    
    closeBtn.addEventListener('mouseout', () => {
        closeBtn.style.backgroundColor = 'transparent';
        closeBtn.style.color = '#666';
    });
    
    closeBtn.addEventListener('click', () => {
        container.remove();
        activeCommentUI = null;
        // Show the generate button again
        if (generateButton) {
            generateButton.style.display = 'inline-flex';
        }
    });

    // Add event listeners
    regenerateBtn.addEventListener('click', async () => {
        const content = extractPostContent(post);
        debug.log('Extracted post content for comment generation', content);
        
        // Show loading state
        commentBox.value = 'Analyzing Post...';
        regenerateBtn.disabled = true;
        
        try {
            const hint = hintInput.value.trim();
            const tone = toneSelect.value;
            const model = modelSelect.value;
            
            // Only use the API - no fallback to local generation
            try {
                const comment = await generateCommentAPI(content, hint, tone, model);
                commentBox.value = comment;
                hintInput.style.display = 'block'
            } catch (apiError) {
                debug.error('API generation failed', apiError);
                
                // Show clear error message to user
                commentBox.value = `Error: Could not generate comment. ${apiError.message}\n\nPlease check API configuration or try again later.`;
            }
        } catch (error) {
            debug.error('Error in comment generation process', error);
            commentBox.value = `Error: ${error.message || 'Unknown error occurred while generating comment.'}`;
        }
        
        regenerateBtn.disabled = false;
    });
    
    // Assemble the UI
    buttonContainer.appendChild(regenerateBtn);
    container.appendChild(closeBtn);
    container.appendChild(heading);
    container.appendChild(toneContainer); // Add the tone dropdown
    container.appendChild(modelContainer); // Add the model dropdown
    container.appendChild(commentBoxContainer); // Use container instead of just commentBox
    container.appendChild(hintInput); // Moved hintInput after commentBoxContainer
    container.appendChild(copyNote); // Add the note
    container.appendChild(buttonContainer);
    
    return container;
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
    
    return button;
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
                        
                        // Add click handler
                        button.addEventListener('click', (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            
                            // Remove any existing comment UI
                            if (activeCommentUI) {
                                activeCommentUI.remove();
                                activeCommentUI = null;
                            }
                            
                            // Hide the generate button
                            button.style.display = 'none';
                            
                            // Create and add comment UI - add it after the action bar
                            const commentUI = createCommentUI(post, button);
                            actionBar.parentNode.insertBefore(commentUI, actionBar.nextSibling);
                            activeCommentUI = commentUI;
                            
                            // Auto-generate initial comment
                            const regenerateBtn = commentUI.querySelector('button');
                            if (regenerateBtn && regenerateBtn.textContent === 'Generate') {
                                regenerateBtn.click();
                            }
                        });
                        
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
                    
                    // Add click handler
                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // Remove any existing comment UI
                        if (activeCommentUI) {
                            activeCommentUI.remove();
                            activeCommentUI = null;
                        }
                        
                        // Hide the generate button
                        button.style.display = 'none';
                        
                        // Create and add comment UI
                        const commentUI = createCommentUI(post, button);
                        actionBar.parentNode.insertBefore(commentUI, actionBar.nextSibling);
                        activeCommentUI = commentUI;
                        
                        // Auto-generate initial comment
                        const regenerateBtn = commentUI.querySelector('button');
                        if (regenerateBtn && regenerateBtn.textContent === 'Generate') {
                            regenerateBtn.click();
                        }
                    });
                    
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
            
            // Add click handler
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // Remove any existing comment UI
                if (activeCommentUI) {
                    activeCommentUI.remove();
                    activeCommentUI = null;
                }
                
                // Hide the generate button
                button.style.display = 'none';
                
                // Create and add comment UI
                const commentUI = createCommentUI(post, button);
                button.parentNode.insertBefore(commentUI, button.nextSibling);
                activeCommentUI = commentUI;
                
                // Auto-generate initial comment
                const regenerateBtn = commentUI.querySelector('button');
                if (regenerateBtn && regenerateBtn.textContent === 'Generate') {
                    regenerateBtn.click();
                }
            });
            
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
}

// Function to paste comment into LinkedIn's comment box
async function pasteComment(comment) {
    debug.log('Attempting to paste comment');
    if (debug.isDebugMode) debug.showVisualFeedback('Starting comment paste process', null, 'info');
    
    try {
        // Find and click the comment button first
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
            // Wait longer for comment box to appear, LinkedIn can be slow
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            if (debug.isDebugMode) debug.showVisualFeedback('No comment button found!', null, 'error');
        }
        
        // Try to find the comment box
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
            
            // One more attempt: Look for any editable elements that appeared after clicking comment
            const editableElements = document.querySelectorAll('[contenteditable="true"], [role="textbox"]');
            for (const element of editableElements) {
                if (element.offsetParent !== null) {
                    commentBox = element;
                    debug.log('Found potential comment box via editable element search', element);
                    if (debug.isDebugMode) debug.showVisualFeedback('Found potential comment box via fallback search', element, 'warning');
                    break;
                }
            }
            
            if (!commentBox) {
            return false;
            }
        }
        
        debug.log('Comment box details', {
            tagName: commentBox.tagName,
            className: commentBox.className,
            id: commentBox.id,
            contentEditable: commentBox.contentEditable,
            role: commentBox.getAttribute('role'),
            selector: usedSelector
        });
        
        // Focus on the comment box multiple times to ensure LinkedIn registers it
        commentBox.focus();
        commentBox.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        commentBox.focus();
        
        // Clear any existing content
        commentBox.innerHTML = '';
        
        // Log the browser info
        debug.log('Browser info', {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            vendor: navigator.vendor
        });
        
        // === APPROACH 1: Clipboard API ===
        let success = false;
        
        try {
            // Try clipboard approach first
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
            debug.log('Tried clipboard paste approach');
            
            // Check if paste worked
            if (commentBox.textContent || commentBox.innerText) {
                success = true;
                if (debug.isDebugMode) debug.showVisualFeedback('Clipboard paste successful!', commentBox, 'success');
            } else {
                if (debug.isDebugMode) debug.showVisualFeedback('Clipboard paste failed', commentBox, 'error');
            }
        } catch (clipboardError) {
            debug.error('Clipboard paste failed', clipboardError);
            if (debug.isDebugMode) debug.showVisualFeedback(`Clipboard error: ${clipboardError.message}`, null, 'error');
        }
        
        // === APPROACH 2: Direct text insertion ===
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
                } else {
                    if (debug.isDebugMode) debug.showVisualFeedback('Direct text insertion failed', commentBox, 'error');
                }
            } catch (textError) {
                debug.error('Direct text insertion failed', textError);
                if (debug.isDebugMode) debug.showVisualFeedback(`Text insertion error: ${textError.message}`, null, 'error');
            }
        }
        
        // === APPROACH 3: InputEvent simulation ===
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
                    } else {
                        if (debug.isDebugMode) debug.showVisualFeedback('InputEvent and execCommand failed', commentBox, 'error');
                    }
                }
            } catch (inputError) {
                debug.error('InputEvent simulation failed', inputError);
                if (debug.isDebugMode) debug.showVisualFeedback(`InputEvent error: ${inputError.message}`, null, 'error');
            }
        }
        
        // === APPROACH 4: Character-by-character simulation ===
        if (!success) {
            try {
                debug.log('Trying character-by-character typing');
                if (debug.isDebugMode) debug.showVisualFeedback('Trying character-by-character typing', commentBox, 'info');
                
                // Clear content again
                commentBox.innerHTML = '';
                commentBox.focus();
                
                // Simulate typing character by character
                for (let i = 0; i < comment.length; i++) {
                    const char = comment.charAt(i);
                    
                    // Dispatch events for each character
                    commentBox.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
                    commentBox.dispatchEvent(new InputEvent('beforeinput', { 
                        inputType: 'insertText',
                        data: char,
                        bubbles: true
                    }));
                    
                    // Actually insert the character
                    document.execCommand('insertText', false, char);
                    
                    commentBox.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
                    commentBox.dispatchEvent(new InputEvent('input', { 
                        inputType: 'insertText',
                        data: char,
                        bubbles: true
                    }));
                    
                    // Small delay to simulate realistic typing
                    if (i % 5 === 0 && i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                }
                
                // Check if character simulation worked
                if (commentBox.textContent || commentBox.innerText) {
                    success = true;
                    if (debug.isDebugMode) debug.showVisualFeedback('Character-by-character typing successful!', commentBox, 'success');
                } else {
                    if (debug.isDebugMode) debug.showVisualFeedback('Character-by-character typing failed', commentBox, 'error');
                }
            } catch (charError) {
                debug.error('Character simulation failed', charError);
                if (debug.isDebugMode) debug.showVisualFeedback(`Character simulation error: ${charError.message}`, null, 'error');
            }
        }
        
        // Dispatch necessary events to trigger LinkedIn's UI update
        const events = ['input', 'change', 'blur', 'focus'];
        events.forEach(eventType => {
            commentBox.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        // Log what's in the comment box
        debug.log('Comment box content after insertion attempts', {
            textContent: commentBox.textContent,
            innerText: commentBox.innerText,
            innerHTML: commentBox.innerHTML.substring(0, 100) + (commentBox.innerHTML.length > 100 ? '...' : '')
        });
        
        // Try to find a "post" or "submit" button if pasting succeeded
        if (success) {
            debug.log('Comment insertion succeeded, looking for post button');
            if (debug.isDebugMode) debug.showVisualFeedback('Text inserted successfully! Looking for post button...', null, 'success');
            
            // Short wait to ensure LinkedIn's UI has processed the input
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try to find and click the post button
            const postButtonSelectors = [
                'button[aria-label*="Post"]',
                'button[aria-label*="post"]',
                'button.comments-comment-box__submit-button',
                'button.artdeco-button--primary',
                'button.comments-comment-box-comment__submit-button',
                'button.artdeco-button[type="submit"]'
            ];
            
            let postButton = null;
            let postButtonSelector = '';
            for (const selector of postButtonSelectors) {
                const buttons = document.querySelectorAll(selector);
                for (const button of buttons) {
                    if (button.offsetParent !== null && 
                        (button.textContent.includes('Post') || 
                         button.getAttribute('aria-label')?.includes('Post'))) {
                        postButton = button;
                        postButtonSelector = selector;
                        break;
                    }
                }
                if (postButton) break;
            }
            
            if (postButton && !postButton.disabled) {
                debug.log('Found post button, clicking it');
                if (debug.isDebugMode) debug.showVisualFeedback(`Found post button with selector: ${postButtonSelector}`, postButton, 'success');
                postButton.click();
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                debug.log('No post button found or button is disabled');
                if (debug.isDebugMode) debug.showVisualFeedback('No post button found or button is disabled', null, 'warning');
            }
        } else {
            if (debug.isDebugMode) debug.showVisualFeedback('All text insertion methods failed!', null, 'error');
        }
        
        return success;
    } catch (error) {
        debug.error('Error in pasteComment', error);
        if (debug.isDebugMode) debug.showVisualFeedback(`Paste comment error: ${error.message}`, null, 'error');
        return false;
    }
}

// Alternative approach to insert comments directly
async function directCommentInsertion(comment, post) {
    debug.log('Attempting direct comment insertion approach');
    
    try {
        // Try to find the closest comment section to the post
        const commentSections = document.querySelectorAll('.comments-comment-box, .comments-comments-list, [data-test-id*="comments-section"]');
        let closestCommentSection = null;
        let minDistance = Infinity;
        
        // Find comment section closest to the post
        const postRect = post.getBoundingClientRect();
        for (const section of commentSections) {
            const sectionRect = section.getBoundingClientRect();
            const distance = Math.abs(sectionRect.top - postRect.bottom);
            if (distance < minDistance) {
                minDistance = distance;
                closestCommentSection = section;
            }
        }
        
        if (!closestCommentSection) {
            debug.log('No comment section found near post, looking for any comment section');
            // Try to find any comment section that's visible
            for (const section of commentSections) {
                if (section.offsetParent !== null) {
                    closestCommentSection = section;
                    break;
                }
            }
        }
        
        if (!closestCommentSection) {
            debug.error('Could not find any comment section');
            return false;
        }
        
        debug.log('Found comment section', closestCommentSection);
        
        // First try: Look for existing comment button and click it
        const commentBtns = post.querySelectorAll('button[aria-label*="comment" i], [data-control-name="comment"]');
        for (const btn of commentBtns) {
            if (btn.offsetParent !== null) {
                debug.log('Clicking comment button in post');
                btn.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                break;
            }
        }
        
        // Look for the comment box within the comment section
        const commentBoxSelectors = [
            'div[contenteditable="true"]', 
            'div[role="textbox"]',
            '[data-placeholder="Add a comment…"]',
            '.comments-comment-texteditor',
            'p[contenteditable="true"]'
        ];
        
        let commentBox = null;
        
        // First try in the comment section
        for (const selector of commentBoxSelectors) {
            const boxes = closestCommentSection.querySelectorAll(selector);
            for (const box of boxes) {
                if (box.offsetParent !== null) {
                    commentBox = box;
                    break;
                }
            }
            if (commentBox) break;
        }
        
        // If not found, try in the entire document but within view
        if (!commentBox) {
            for (const selector of commentBoxSelectors) {
                const boxes = document.querySelectorAll(selector);
                for (const box of boxes) {
                    if (box.offsetParent !== null) {
                        const rect = box.getBoundingClientRect();
                        // Check if visible in viewport
                        if (rect.top >= 0 && rect.left >= 0 && 
                            rect.bottom <= window.innerHeight && 
                            rect.right <= window.innerWidth) {
                            commentBox = box;
                            break;
                        }
                    }
                }
                if (commentBox) break;
            }
        }
        
        if (!commentBox) {
            debug.error('Could not find comment box in direct insertion approach');
            return false;
        }
        
        debug.log('Found comment box in direct approach', commentBox);
        
        // Focus the comment box multiple times
        commentBox.focus();
        await new Promise(resolve => setTimeout(resolve, 300));
        commentBox.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        commentBox.focus();
        
        // Try different insertion methods
        let success = false;
        
        // Method 1: Set innerHTML
        try {
            commentBox.innerHTML = '';
            commentBox.innerHTML = comment;
            await new Promise(resolve => setTimeout(resolve, 300));
            
            if (commentBox.textContent.includes(comment)) {
                success = true;
            }
        } catch (err) {
            debug.error('innerHTML insertion failed', err);
        }
        
        // Method 2: Direct property assignment
        if (!success) {
            try {
                commentBox.textContent = comment;
                await new Promise(resolve => setTimeout(resolve, 300));
                
                if (commentBox.textContent.includes(comment)) {
                    success = true;
                }
            } catch (err) {
                debug.error('textContent insertion failed', err);
            }
        }
        
        // Method 3: Word-by-word insertion
        if (!success) {
            try {
                commentBox.innerHTML = '';
                const words = comment.split(' ');
                
                for (const word of words) {
                    // Type word
                    document.execCommand('insertText', false, word + ' ');
                    commentBox.dispatchEvent(new Event('input', { bubbles: true }));
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                if (commentBox.textContent.includes(comment.substring(0, 20))) {
                    success = true;
                }
            } catch (err) {
                debug.error('Word-by-word insertion failed', err);
            }
        }
        
        // Method 4: Selection-based insertion
        if (!success) {
            try {
                // Create a text selection in the comment box
                const range = document.createRange();
                range.selectNodeContents(commentBox);
                
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Delete any existing content
                document.execCommand('delete');
                
                // Insert the new text
                document.execCommand('insertText', false, comment);
                
                if (commentBox.textContent.includes(comment.substring(0, 20))) {
                    success = true;
                }
            } catch (err) {
                debug.error('Selection-based insertion failed', err);
            }
        }
        
        if (success) {
            debug.log('Successfully inserted comment text, looking for post button');
            
            // Trigger necessary events
            ['input', 'change', 'keyup', 'blur', 'focus'].forEach(evt => {
                commentBox.dispatchEvent(new Event(evt, { bubbles: true }));
            });
            
            // Look for a post/submit button
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const postButtonSelectors = [
                'button[aria-label*="Post"]',
                'button[aria-label*="post"]',
                'button.comments-comment-box__submit-button',
                'button.artdeco-button--primary',
                'button.comments-comment-box-comment__submit-button',
                'button.artdeco-button[type="submit"]'
            ];
            
            let postButton = null;
            // First look near the comment box
            const commentBoxParent = commentBox.closest('form, div.comments-comment-box, div.comments-comment-texteditor');
            
            if (commentBoxParent) {
                for (const selector of postButtonSelectors) {
                    const buttons = commentBoxParent.querySelectorAll(selector);
                    for (const button of buttons) {
                        if (button.offsetParent !== null && 
                            !button.disabled &&
                            (!button.hasAttribute('disabled') || button.getAttribute('disabled') !== 'true')) {
                            postButton = button;
                            break;
                        }
                    }
                    if (postButton) break;
                }
            }
            
            // If not found, look within a reasonable distance from the comment box
            if (!postButton) {
                for (const selector of postButtonSelectors) {
                    const buttons = document.querySelectorAll(selector);
                    for (const button of buttons) {
                        if (button.offsetParent !== null && 
                            !button.disabled &&
                            (!button.hasAttribute('disabled') || button.getAttribute('disabled') !== 'true')) {
                            const buttonRect = button.getBoundingClientRect();
                            const commentBoxRect = commentBox.getBoundingClientRect();
                            const distance = Math.sqrt(
                                Math.pow(buttonRect.left - commentBoxRect.right, 2) + 
                                Math.pow(buttonRect.top - commentBoxRect.bottom, 2)
                            );
                            
                            // Only consider buttons that are reasonably close to the comment box
                            if (distance < 300) {
                                postButton = button;
                                break;
                            }
                        }
                    }
                    if (postButton) break;
                }
            }
            
            if (postButton) {
                debug.log('Found post button, clicking it', postButton);
                postButton.click();
                return true;
            } else {
                debug.log('Comment text inserted, but no post button found. User may need to press Enter to submit.');
                
                // As a last resort, try simulating Enter key press
                commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                }));
                
                return true;
            }
        }
        
        return false;
    } catch (error) {
        debug.error('Error in direct comment insertion', error);
        return false;
    }
}

// Add this new function below the existing directCommentInsertion function
async function simpleTypeComment(comment) {
    debug.log('Attempting enhanced simple type approach for comment insertion');
    
    try {
        // First, try to find and click the comment button
        const commentButtonSelectors = [
            'button[aria-label*="comment" i]',
            '[data-control-name="comment"]',
            '[role="button"][aria-label*="comment" i]',
            'button.comment-button',
            '.comment-button',
            'button[aria-label*="Add a comment"]',
            'button[aria-label*="Reply"]',
            '[data-control-name="reply"]'
        ];
        
        let foundButton = false;
        for (const selector of commentButtonSelectors) {
            const buttons = document.querySelectorAll(selector);
            for (const btn of buttons) {
                if (btn.offsetParent !== null) {
                    debug.log('Clicking comment button:', selector);
                    btn.click();
                    foundButton = true;
                    // Wait for comment box to appear
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    break;
                }
            }
            if (foundButton) break;
        }
        
        if (!foundButton) {
            debug.error('No comment button found');
            return false;
        }
        
        // Now find the comment box with enhanced selectors
        const commentBoxSelectors = [
            '[contenteditable="true"]',
            '[role="textbox"]',
            '[data-placeholder="Add a comment…"]',
            '[data-placeholder="Reply…"]',
            '[aria-label*="Add a comment" i]',
            '[aria-label*="Write a comment" i]',
            '[aria-label*="Add your comment" i]',
            '.ql-editor',
            '.editor-content',
            'div.comments-comment-box__content-editor',
            // Add more modern LinkedIn comment box selectors
            'div.comments-comment-texteditor__content',
            'div.comments-comment-box-comment__text-editor',
            'div[role="textbox"][data-test-id*="comment-box"]'
        ];
        
        let commentBox = null;
        for (const selector of commentBoxSelectors) {
            const boxes = document.querySelectorAll(selector);
            for (const box of boxes) {
                if (box.offsetParent !== null) {
                    commentBox = box;
                    debug.log('Found comment box:', selector);
                    break;
                }
            }
            if (commentBox) break;
        }
        
        if (!commentBox) {
            debug.error('No comment box found after clicking comment button');
            return false;
        }
        
        // Focus and prepare the comment box
        commentBox.focus();
        commentBox.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Clear existing content
        commentBox.innerHTML = '';
        
        // Enhanced character typing with multiple fallback methods
        const typeCharacter = async (char) => {
            return new Promise(resolve => {
                setTimeout(async () => {
                    try {
                        // Method 1: Use execCommand
                        document.execCommand('insertText', false, char);
                        
                        // Method 2: Create and insert text node if needed
                        if (!commentBox.textContent.includes(char)) {
                            const range = document.createRange();
                            const sel = window.getSelection();
                            range.selectNodeContents(commentBox);
                            range.collapse(false);
                            sel.removeAllRanges();
                            sel.addRange(range);
                            
                            const textNode = document.createTextNode(char);
                            range.insertNode(textNode);
                            
                            // Move selection to end
                            range.setStartAfter(textNode);
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                        
                        // Method 3: Simulate keyboard events
                        commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                            key: char,
                            code: `Key${char.toUpperCase()}`,
                            bubbles: true
                        }));
                        
                        commentBox.dispatchEvent(new InputEvent('beforeinput', {
                            inputType: 'insertText',
                            data: char,
                            bubbles: true
                        }));
                        
                        commentBox.dispatchEvent(new InputEvent('input', {
                            inputType: 'insertText',
                            data: char,
                            bubbles: true
                        }));
                        
                        commentBox.dispatchEvent(new KeyboardEvent('keyup', {
                            key: char,
                            code: `Key${char.toUpperCase()}`,
                            bubbles: true
                        }));
                        
                        // Fire input event to notify LinkedIn
                        commentBox.dispatchEvent(new Event('input', { bubbles: true }));
                        commentBox.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        resolve();
                    } catch (err) {
                        debug.error(`Error typing character: ${char}`, err);
                        resolve();
                    }
                }, 50); // Small delay between characters
            });
        };
        
        // Type each character with enhanced error handling
        for (let i = 0; i < comment.length; i++) {
            await typeCharacter(comment[i]);
        }
        
        debug.log('Comment typing completed');
        
        // Wait for LinkedIn to process the input
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Enhanced post button detection
        const postButtonSelectors = [
            'button[aria-label*="Post" i]',
            'button[aria-label*="post" i]',
            'button[aria-label*="Reply" i]',
            'button[aria-label*="reply" i]',
            'button.comments-comment-box__submit-button',
            'button.artdeco-button[type="submit"]',
            'button.artdeco-button--primary',
            // Modern LinkedIn post button selectors
            'button.comments-comment-box-comment__submit-button',
            'button.comments-comment-texteditor__button',
            'button.artdeco-button--4',
            'button.artdeco-button--1',
            'button.ml2',
            'button.comments-comment-box__submit'
        ];
        
        let postButton = null;
        for (const selector of postButtonSelectors) {
            const buttons = document.querySelectorAll(selector);
            for (const button of buttons) {
                // Check if button is visible and enabled
                if (button.offsetParent !== null && !button.disabled) {
                    // Check if it's near our comment box (in the same container or close by)
                    const buttonRect = button.getBoundingClientRect();
                    const commentBoxRect = commentBox.getBoundingClientRect();
                    
                    // Button should be below or to the right of the comment box and within reasonable distance
                    const isRelated = (
                        buttonRect.top >= commentBoxRect.top - 50 && 
                        buttonRect.bottom <= commentBoxRect.bottom + 100 && 
                        buttonRect.left >= commentBoxRect.left - 50
                    ) || button.closest('form') === commentBox.closest('form');
                    
                    if (isRelated) {
                        postButton = button;
                        debug.log('Found related post button:', button);
                        break;
                    }
                }
            }
            if (postButton) break;
        }
        
        // Step 6: Click the post button or simulate Enter key
        if (postButton) {
            debug.log('Clicking post button');
            postButton.click();
            return true;
        } else {
            debug.log('No post button found, trying Enter key');
            // Simulate pressing Enter key
            commentBox.focus();
            commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
            }));
            
            // Also try both ctrl+Enter and shift+Enter as some platforms use these
            await new Promise(resolve => setTimeout(resolve, 300));
            commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                ctrlKey: true,
                bubbles: true
            }));
            
            await new Promise(resolve => setTimeout(resolve, 300));
            commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                shiftKey: true,
                bubbles: true
            }));
            
            return true;
        }
    } catch (error) {
        debug.error('Error in enhanced simple type approach', error);
        return false;
    }
}

// Add this new function for a reliable direct method of comment insertion
async function forceCommentInsertion(comment) {
    debug.log('Attempting FORCE comment insertion method');
    
    try {
        // Step 1: Find and click any visible comment button
        const allCommentButtons = document.querySelectorAll([
            'button[aria-label*="comment" i]', 
            'button.comment-button',
            '[role="button"][aria-label*="comment" i]',
            '[data-control-name="comment"]',
            'button[aria-label*="Add a comment"]',
            'button[aria-label*="Reply"]',
            '.comment-button',
            // Add modern LinkedIn comment button selectors
            'button.comments-post-meta__comment-button',
            'button.social-actions-button[aria-label*="comment" i]',
            'button[type="button"][aria-label*="comment" i]',
            'div[role="button"][aria-label*="comment" i]'
        ].join(','));
        
        let commentButtonClicked = false;
        debug.log(`Found ${allCommentButtons.length} potential comment buttons`);
        
        for (const btn of allCommentButtons) {
            if (btn.offsetParent !== null) {
                debug.log('Clicking visible comment button:', btn);
                btn.click();
                commentButtonClicked = true;
                // Wait for comment box to appear
                await new Promise(resolve => setTimeout(resolve, 1500));
                break;
            }
        }
        
        if (!commentButtonClicked) {
            debug.error('No visible comment button found');
            return false;
        }
        
        // Step 2: Find the comment box that appeared
        const potentialCommentBoxes = document.querySelectorAll([
            '[contenteditable="true"]',
            '[role="textbox"]',
            '[data-placeholder="Add a comment…"]',
            '[data-placeholder="Reply…"]',
            '[aria-label*="Add a comment" i]',
            '[aria-label*="Write a comment" i]',
            '[aria-label*="Add your comment" i]',
            '.ql-editor',
            '.editor-content',
            'div.comments-comment-box__content-editor',
            // Add more modern LinkedIn comment box selectors
            'div.comments-comment-texteditor__content',
            'div.comments-comment-box-comment__text-editor',
            'div[role="textbox"][data-test-id*="comment-box"]'
        ].join(','));
        
        let commentBox = null;
        debug.log(`Found ${potentialCommentBoxes.length} potential comment boxes`);
        
        for (const box of potentialCommentBoxes) {
            // Check if the element is visible and editable
            if (box.offsetParent !== null) {
                // Check if it's actually a comment box by testing if we can focus it
                box.focus();
                if (document.activeElement === box) {
                    commentBox = box;
                    debug.log('Found usable comment box:', box);
                    break;
                }
            }
        }
        
        if (!commentBox) {
            debug.error('No usable comment box found');
            return false;
        }
        
        // Step 3: Focus and clear the comment box
        commentBox.focus();
        commentBox.click();
        
        // Wait for focus to take effect
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Clear existing content
        commentBox.textContent = '';
        commentBox.innerHTML = '';
        
        // Step 4: Insert the comment text (using multiple methods)
        debug.log('Inserting comment text using multiple methods');
        
        // Method 1: Simple text assignment with events
        commentBox.textContent = comment;
        commentBox.dispatchEvent(new Event('input', { bubbles: true }));
        commentBox.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Check if it worked
        if (!commentBox.textContent.includes(comment.substring(0, 10))) {
            debug.log('Method 1 failed, trying Method 2');
            
            // Method 2: execCommand approach
            commentBox.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, comment);
            
            // Check if it worked
            if (!commentBox.textContent.includes(comment.substring(0, 10))) {
                debug.log('Method 2 failed, trying Method 3');
                
                // Method 3: Character by character typing
                commentBox.innerHTML = '';
                for (let i = 0; i < comment.length; i++) {
                    document.execCommand('insertText', false, comment[i]);
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
        }
        
        // Give LinkedIn time to process the text
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 5: Look for post/reply button with enhanced selectors
        const postButtonSelectors = [
            'button[aria-label*="Post" i]',
            'button[aria-label*="post" i]',
            'button[aria-label*="Reply" i]',
            'button[aria-label*="reply" i]',
            'button.comments-comment-box__submit-button',
            'button.artdeco-button[type="submit"]',
            'button.artdeco-button--primary',
            // Modern LinkedIn post button selectors
            'button.comments-comment-box-comment__submit-button',
            'button.comments-comment-texteditor__button',
            'button.artdeco-button--4',
            'button.artdeco-button--1',
            'button.ml2',
            'button.comments-comment-box__submit'
        ];
        
        let postButton = null;
        for (const selector of postButtonSelectors) {
            const buttons = document.querySelectorAll(selector);
            for (const button of buttons) {
                // Check if button is visible and enabled
                if (button.offsetParent !== null && !button.disabled) {
                    // Check if it's near our comment box (in the same container or close by)
                    const buttonRect = button.getBoundingClientRect();
                    const commentBoxRect = commentBox.getBoundingClientRect();
                    
                    // Button should be below or to the right of the comment box and within reasonable distance
                    const isRelated = (
                        buttonRect.top >= commentBoxRect.top - 50 && 
                        buttonRect.bottom <= commentBoxRect.bottom + 100 && 
                        buttonRect.left >= commentBoxRect.left - 50
                    ) || button.closest('form') === commentBox.closest('form');
                    
                    if (isRelated) {
                        postButton = button;
                        debug.log('Found related post button:', button);
                        break;
                    }
                }
            }
            if (postButton) break;
        }
        
        // Step 6: Click the post button or simulate Enter key
        if (postButton) {
            debug.log('Clicking post button');
            postButton.click();
            return true;
        } else {
            debug.log('No post button found, trying Enter key');
            // Simulate pressing Enter key
            commentBox.focus();
            commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
            }));
            
            // Also try both ctrl+Enter and shift+Enter as some platforms use these
            await new Promise(resolve => setTimeout(resolve, 300));
            commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                ctrlKey: true,
                bubbles: true
            }));
            
            await new Promise(resolve => setTimeout(resolve, 300));
            commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                shiftKey: true,
                bubbles: true
            }));
            
            return true;
        }
    } catch (error) {
        debug.error('Force comment insertion failed:', error);
        return false;
    }
}

// Add this new function for an ultra-aggressive comment insertion method
async function ultraForceCommentInsertion(comment) {
    debug.log('Attempting ULTRA-FORCE comment insertion - using all available techniques');
    
    try {
        // STEP 1: Find and click the comment button using ALL possible methods
        let commentButtonClicked = false;
        
        // Method 1: Direct query and click
        const commentButtonSelectors = [
            'button[aria-label*="comment" i]',
            'button.comment-button',
            '[role="button"][aria-label*="comment" i]',
            '[data-control-name="comment"]',
            'button[aria-label*="Add a comment"]',
            'button[aria-label*="Reply"]',
            '.comment-button',
            'button.comments-post-meta__comment-button',
            'button.social-actions-button[aria-label*="comment" i]',
            'button[type="button"][aria-label*="comment" i]',
            'div[role="button"][aria-label*="comment" i]',
            // Most recent LinkedIn selectors
            'button.social-actions__button[aria-label*="comment" i]',
            'div.social-action-button[aria-label*="comment" i]',
            'button.comment-button[type="button"]'
        ];
        
        for (const selector of commentButtonSelectors) {
            if (commentButtonClicked) break;
            
            const buttons = document.querySelectorAll(selector);
            debug.log(`Found ${buttons.length} buttons with selector: ${selector}`);
            
            for (const btn of buttons) {
                if (btn.offsetParent !== null) {
                    // Try multiple ways to click the button
                    try {
                        debug.log('Clicking comment button with direct click', btn);
                        btn.click();
                        
                        // Also try MouseEvent simulation
                        btn.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                        btn.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                        btn.dispatchEvent(new MouseEvent('click', {bubbles: true}));
                        
                        commentButtonClicked = true;
                        
                        // Wait for comment box to appear with a slightly randomized delay
                        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 500));
                        break;
                    } catch (e) {
                        debug.error('Error clicking button', e);
                    }
                }
            }
        }
        
        // Method 2: Use document.evaluate to find comment buttons by text content
        if (!commentButtonClicked) {
            debug.log('Trying XPath to find comment buttons by text');
            const xpathSelectors = [
                "//button[contains(translate(., 'COMMENT', 'comment'), 'comment')]",
                "//div[@role='button' and contains(translate(., 'COMMENT', 'comment'), 'comment')]",
                "//button[contains(@aria-label, 'comment') or contains(@aria-label, 'Comment')]"
            ];
            
            for (const xpath of xpathSelectors) {
                if (commentButtonClicked) break;
                
                try {
                    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    debug.log(`Found ${result.snapshotLength} buttons with XPath: ${xpath}`);
                    
                    for (let i = 0; i < result.snapshotLength; i++) {
                        const btn = result.snapshotItem(i);
                        if (btn && btn.offsetParent !== null) {
                            debug.log('Clicking button found via XPath', btn);
                            btn.click();
                            commentButtonClicked = true;
                            
                            // Wait for comment box to appear
                            await new Promise(resolve => setTimeout(resolve, 1800));
                            break;
                        }
                    }
                } catch (e) {
                    debug.error('XPath error', e);
                }
            }
        }
        
        if (!commentButtonClicked) {
            debug.error('Failed to click any comment button');
            // Continue anyway - the comment box might already be open
        }
        
        // STEP 2: Find the comment box using ALL possible methods
        let commentBox = null;
        
        // Method 1: Try standard selectors
        const commentBoxSelectors = [
            '[contenteditable="true"]',
            '[role="textbox"]',
            '[data-placeholder="Add a comment…"]',
            '[data-placeholder="Reply…"]',
            '[aria-label*="Add a comment" i]',
            '[aria-label*="Write a comment" i]',
            '[aria-label*="Add your comment" i]',
            '.ql-editor',
            '.editor-content',
            'div.comments-comment-box__content-editor',
            'div.comments-comment-texteditor__content',
            'div.comments-comment-box-comment__text-editor',
            'div[role="textbox"][data-test-id*="comment-box"]',
            // Most recent LinkedIn selectors
            'div.editor-container [contenteditable="true"]',
            'div.comments-comment-box-comment__text-editor div[contenteditable="true"]',
            'div.comments-comment-texteditor [contenteditable="true"]'
        ];
        
        for (const selector of commentBoxSelectors) {
            if (commentBox) break;
            
            const boxes = document.querySelectorAll(selector);
            debug.log(`Found ${boxes.length} possible comment boxes with selector: ${selector}`);
            
            for (const box of boxes) {
                if (box.offsetParent !== null) {
                    try {
                        // Test if we can actually focus and write to this element
                        box.focus();
                        if (document.activeElement === box || box.isContentEditable) {
                            commentBox = box;
                            debug.log('Found usable comment box', box);
                            break;
                        }
                    } catch (e) {
                        debug.error('Error testing comment box', e);
                    }
                }
            }
        }
        
        // Method 2: Find visible contenteditable elements that appeared after clicking comment
        if (!commentBox) {
            debug.log('Looking for recently appeared contenteditable elements');
            const editableElements = document.querySelectorAll('[contenteditable="true"], [role="textbox"]');
            
            for (const el of editableElements) {
                if (el.offsetParent !== null) {
                    try {
                        el.focus();
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        if (document.activeElement === el) {
                            commentBox = el;
                            debug.log('Found comment box via contenteditable search', el);
                            break;
                        }
                    } catch (e) {
                        debug.error('Error testing editable element', e);
                    }
                }
            }
        }
        
        if (!commentBox) {
            debug.error('Could not find any usable comment box');
            return false;
        }
        
        // STEP 3: Focus and clear the comment box using multiple methods
        debug.log('Preparing comment box for text insertion');
        
        // Method 1: Standard focus and clear
        commentBox.focus();
        commentBox.click();
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Clear content using multiple approaches
        commentBox.textContent = '';
        commentBox.innerHTML = '';
        
        try {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(commentBox);
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('delete', false, null);
        } catch (e) {
            debug.error('Error clearing comment box with selection', e);
        }
        
        // STEP 4: Insert the comment text using ALL possible methods
        debug.log('Inserting comment text using multiple aggressive methods');
        
        let textInserted = false;
        
        // Method 1: Direct clipboard manipulation
        try {
            debug.log('Attempting clipboard method');
            await navigator.clipboard.writeText(comment);
            
            // Try both Ctrl+V and Command+V for cross-platform
            const isMac = navigator.userAgent.indexOf('Mac') !== -1;
            
            commentBox.focus();
            commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'v',
                code: 'KeyV',
                ctrlKey: !isMac,
                metaKey: isMac,
                bubbles: true
            }));
            
            // Also try execCommand
            document.execCommand('paste');
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (commentBox.textContent.includes(comment.substring(0, 10))) {
                textInserted = true;
                debug.log('Clipboard method successful');
            }
        } catch (e) {
            debug.error('Clipboard method failed', e);
        }
        
        // Method 2: Direct property assignment with events
        if (!textInserted) {
            try {
                debug.log('Attempting direct text assignment');
                commentBox.textContent = comment;
                commentBox.dispatchEvent(new Event('input', { bubbles: true }));
                commentBox.dispatchEvent(new Event('change', { bubbles: true }));
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                if (commentBox.textContent.includes(comment.substring(0, 10))) {
                    textInserted = true;
                    debug.log('Direct text assignment successful');
                }
            } catch (e) {
                debug.error('Direct text assignment failed', e);
            }
        }
        
        // Method 3: execCommand with selection
        if (!textInserted) {
            try {
                debug.log('Attempting execCommand insertText');
                commentBox.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('delete', false, null);
                document.execCommand('insertText', false, comment);
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                if (commentBox.textContent.includes(comment.substring(0, 10))) {
                    textInserted = true;
                    debug.log('execCommand insertText successful');
                }
            } catch (e) {
                debug.error('execCommand insertText failed', e);
            }
        }
        
        // Method 4: Ultra-slow character by character typing with randomized delays
        if (!textInserted) {
            try {
                debug.log('Attempting character-by-character typing');
                commentBox.innerHTML = '';
                commentBox.focus();
                
                // Type character by character with randomized delays
                for (let i = 0; i < comment.length; i++) {
                    // Wait a random amount of time between keypresses
                    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
                    
                    // Combine multiple approaches for each character
                    try {
                        // 1. execCommand
                        document.execCommand('insertText', false, comment[i]);
                        
                        // 2. Dispatch events
                        const charCode = comment.charCodeAt(i);
                        commentBox.dispatchEvent(new KeyboardEvent('keydown', {
                            key: comment[i],
                            keyCode: charCode,
                            which: charCode,
                            bubbles: true
                        }));
                        
                        commentBox.dispatchEvent(new InputEvent('beforeinput', {
                            inputType: 'insertText',
                            data: comment[i],
                            bubbles: true
                        }));
                        
                        commentBox.dispatchEvent(new InputEvent('input', {
                            inputType: 'insertText',
                            data: comment[i],
                            bubbles: true
                        }));
                        
                        commentBox.dispatchEvent(new KeyboardEvent('keyup', {
                            key: comment[i],
                            keyCode: charCode,
                            which: charCode,
                            bubbles: true
                        }));
                    } catch (e) {
                        debug.error(`Error typing character ${comment[i]}`, e);
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                if (commentBox.textContent.includes(comment.substring(0, 10))) {
                    textInserted = true;
                    debug.log('Character-by-character typing successful');
                }
            } catch (e) {
                debug.error('Character-by-character typing failed', e);
            }
        }
        
        // Method 5: Node insertion as absolute last resort
        if (!textInserted) {
            try {
                debug.log('Attempting text node insertion');
                // Clear existing content
                while (commentBox.firstChild) {
                    commentBox.removeChild(commentBox.firstChild);
                }
                
                // Create a text node and insert it
                const textNode = document.createTextNode(comment);
                commentBox.appendChild(textNode);
                
                // Fire events
                commentBox.dispatchEvent(new Event('input', { bubbles: true }));
                commentBox.dispatchEvent(new Event('change', { bubbles: true }));
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                if (commentBox.textContent.includes(comment.substring(0, 10))) {
                    textInserted = true;
                    debug.log('Text node insertion successful');
                }
            } catch (e) {
                debug.error('Text node insertion failed', e);
            }
        }
        
        if (!textInserted) {
            debug.error('All text insertion methods failed');
            return false;
        }
        
        // STEP 5: Find the post button using ALL possible methods
        debug.log('Giving LinkedIn time to enable post button');
        // Wait longer to ensure LinkedIn processes the input and enables the Post button
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        let postButton = null;
        
        // Method 1: Use standard selectors and spatial relationship
        const postButtonSelectors = [
            'button[aria-label*="Post" i]',
            'button[aria-label*="post" i]',
            'button[aria-label*="Reply" i]',
            'button[aria-label*="reply" i]',
            'button.comments-comment-box__submit-button',
            'button.artdeco-button[type="submit"]',
            'button.artdeco-button--primary',
            'button.comments-comment-box-comment__submit-button',
            'button.comments-comment-texteditor__button',
            'button.artdeco-button--4',
            'button.artdeco-button--1',
            'button.ml2',
            'button.comments-comment-box__submit',
            // Most recent LinkedIn selectors
            'button.comments-comment-texteditor__controlButton--submit',
            'button.artdeco-button.artdeco-button--4[type="submit"]',
            'button.artdeco-button.artdeco-button--1[type="submit"]'
        ];
        
        for (const selector of postButtonSelectors) {
            if (postButton) break;
            
            const buttons = document.querySelectorAll(selector);
            debug.log(`Found ${buttons.length} possible post buttons with selector: ${selector}`);
            
            for (const button of buttons) {
                // Check if button is visible and enabled
                if (button.offsetParent !== null && !button.disabled) {
                    try {
                        // Check if it's near our comment box or in the same form
                        let isRelated = false;
                        
                        // Method 1: Check for buttons nearby using coordinates
                        const buttonRect = button.getBoundingClientRect();
                        const commentBoxRect = commentBox.getBoundingClientRect();
                        
                        // Should be below or to the right of the comment box and within reasonable distance
                        if (
                            buttonRect.top >= commentBoxRect.top - 100 && 
                            buttonRect.bottom <= commentBoxRect.bottom + 100 && 
                            Math.abs(buttonRect.left - commentBoxRect.right) < 300
                        ) {
                            isRelated = true;
                        }
                        
                        // Method 2: Check ancestor relationships
                        if (!isRelated) {
                            // Find a common container that might be a form or comment component
                            let commentParent = commentBox.parentElement;
                            while (commentParent && !isRelated) {
                                if (commentParent.contains(button)) {
                                    isRelated = true;
                                    break;
                                }
                                commentParent = commentParent.parentElement;
                                
                                // Avoid going too far up
                                if (!commentParent || commentParent === document.body) break;
                            }
                        }
                        
                        // Method 3: Button is in a form with the comment box
                        if (!isRelated && button.closest('form') === commentBox.closest('form')) {
                            isRelated = true;
                        }
                        
                        if (isRelated) {
                            postButton = button;
                            debug.log('Found related post button', button);
                            break;
                        }
                    } catch (e) {
                        debug.error('Error checking post button relationship', e);
                    }
                }
            }
        }
        
        // Method 2: Look for buttons with "Post" or "Reply" text
        if (!postButton) {
            debug.log('Looking for buttons with Post/Reply text');
            const allButtons = document.querySelectorAll('button');
            
            for (const button of allButtons) {
                if (button.offsetParent !== null && !button.disabled) {
                    const buttonText = button.textContent.toLowerCase().trim();
                    if (buttonText === 'post' || buttonText === 'reply') {
                        // Check if it's reasonably close to our comment box
                        const buttonRect = button.getBoundingClientRect();
                        const commentBoxRect = commentBox.getBoundingClientRect();
                        
                        if (Math.abs(buttonRect.left - commentBoxRect.right) < 300 &&
                            Math.abs(buttonRect.top - commentBoxRect.bottom) < 300) {
                            postButton = button;
                            debug.log('Found post button by text content', button);
                            break;
                        }
                    }
                }
            }
        }
        
        // Method 3: Look for any enabled, visible button near the comment box that appeared recently
        if (!postButton) {
            debug.log('Looking for any enabled button near comment box');
            const allButtons = document.querySelectorAll('button');
            
            for (const button of allButtons) {
                if (button.offsetParent !== null && !button.disabled) {
                    // Check if it's close to our comment box
                    const buttonRect = button.getBoundingClientRect();
                    const commentBoxRect = commentBox.getBoundingClientRect();
                    
                    if (buttonRect.bottom >= commentBoxRect.bottom - 50 &&
                        buttonRect.bottom <= commentBoxRect.bottom + 100 &&
                        Math.abs(buttonRect.left - commentBoxRect.right) < 300) {
                        
                        // Check button styles for clues - post buttons are often primary color
                        const style = window.getComputedStyle(button);
                        const backgroundColor = style.backgroundColor.toLowerCase();
                        
                        // LinkedIn's primary button color is often blue or has a solid color
                        if (backgroundColor !== 'transparent' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
                            postButton = button;
                            debug.log('Found possible post button by position and styling', button);
                            break;
                        }
                    }
                }
            }
        }
        
        // STEP 6: Try to submit the comment
        if (postButton) {
            debug.log('Clicking post button using multiple methods');
            
            try {
                // Method 1: Native click
                postButton.click();
                
                // Method 2: MouseEvent simulation
                postButton.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                postButton.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                postButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
                
                // Wait to see if the comment was posted
                await new Promise(resolve => setTimeout(resolve, 2000));
                return true;
            } catch (e) {
                debug.error('Error clicking post button', e);
            }
        }
        
        // Fallback: Try pressing Enter key in multiple ways
        debug.log('No post button found or button click failed, trying Enter key combinations');
        
        // Ensure comment box is still focused
        commentBox.focus();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Method 1: Standard Enter
        commentBox.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
        }));
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Method 2: Ctrl+Enter
        commentBox.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            ctrlKey: true,
            bubbles: true
        }));
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Method 3: Shift+Enter
        commentBox.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            shiftKey: true,
            bubbles: true
        }));
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Method 4: Meta+Enter (Cmd+Enter on Mac)
        commentBox.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            metaKey: true,
            bubbles: true
        }));
        
        return true;
    } catch (error) {
        debug.error('Ultra-force comment insertion failed:', error);
        return false;
    }
}

/**
 * Initializes the LinkedIn Comment Generator extension
 * Sets up observers, keyboard shortcuts, and initial button placement
 */
function initialize() {
    debug.log('LinkedIn Comment Generator initializing');
    
    try {
        // Add keyboard shortcut for debug mode
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+D to toggle debug mode
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                debug.toggleDebugMode();
            }
        });
        
        // Initial run with a longer delay to ensure LinkedIn has fully loaded
        setTimeout(() => {
            // Verify API configuration
            if (!API_CONFIG.URL) {
                debug.error('API endpoint not configured. Comment generation will not work.');
            }
            
            // Add comment generator buttons to posts
            addButtonsToPosts();
            
            // Insert a marker to indicate the extension is active
            const marker = document.createElement('div');
            marker.id = 'linkedin-comment-generator-active';
            marker.style.display = 'none';
            document.body.appendChild(marker);
            
            // Add debug indicator if in debug mode
            if (debug.isDebugMode) {
                const debugIndicator = document.createElement('div');
                debugIndicator.textContent = 'Debug Mode';
                debugIndicator.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: #f44336;
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    z-index: 10000;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                `;
                document.body.appendChild(debugIndicator);
            }
        }, 2000);
        
        // Set up observer for DOM changes to detect new posts
        setupMutationObserver();
        
        // Add diagnostic click handler to help debug issues (only in debug mode)
        document.addEventListener('click', (e) => {
            // Check if user clicked with Alt key pressed (diagnostic mode)
            if (debug.isDebugMode && e.altKey && e.target) {
                const target = e.target;
                debug.log('Diagnostic click on element:', target);
                debug.log('Element classes:', target.className);
                debug.log('Element ID:', target.id);
                debug.log('Element attributes:', Array.from(target.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', '));
            }
        }, true);
    } catch (error) {
        debug.error('Error during initialization', error);
    }
}

/**
 * Sets up mutation observer to detect new posts in the LinkedIn feed
 */
function setupMutationObserver() {
    try {
        // Set up observer for DOM changes
        const observer = new MutationObserver((mutations) => {
            // Only process if we have meaningful DOM changes
            const hasRelevantChanges = mutations.some(mutation => {
                return mutation.addedNodes.length > 0 || 
                      (mutation.target.classList && 
                       (mutation.target.classList.contains('feed-shared-update-v2') || 
                        mutation.target.classList.contains('occludable-update')));
            });
            
            if (hasRelevantChanges) {
                setTimeout(() => {
                    addButtonsToPosts();
                }, 500);
            }
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also check periodically (LinkedIn loads content dynamically)
        const intervalId = setInterval(() => {
            addButtonsToPosts();
        }, 3000);
        
        // Store interval ID for potential cleanup
        window._linkedInCommentGenerator = window._linkedInCommentGenerator || {};
        window._linkedInCommentGenerator.intervalId = intervalId;
        
        debug.log('Mutation observer and interval set up successfully');
    } catch (error) {
        debug.error('Error setting up mutation observer', error);
    }
}

/**
 * Handles messages from popup or background scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    debug.log('Received message', request);
    
    try {
        if (request.action === 'pasteComment') {
            // No longer used but kept for backward compatibility
            sendResponse({ success: false, error: 'Direct comment pasting is not supported' });
        } else if (request.action === 'diagnose') {
            // Diagnostic information
            const diagnosticInfo = {
                userAgent: navigator.userAgent,
                url: window.location.href,
                extensionActive: !!document.getElementById('linkedin-comment-generator-active'),
                apiConfigured: !!API_CONFIG.URL,
                commentablePostsFound: document.querySelectorAll('[data-lcg-post-id]').length,
                buttonsAdded: document.querySelectorAll('.linkedin-comment-generator-button').length,
                commentBoxesFound: document.querySelectorAll('div[contenteditable="true"], div[role="textbox"]').length
            };
            
            debug.log('Diagnostic info collected', diagnosticInfo);
            sendResponse({ success: true, diagnosticInfo });
        } else if (request.action === 'getSelectedPost') {
            // Get the currently viewed post content
            const post = findCurrentPost();
            if (post) {
                const content = extractPostContent(post);
                sendResponse({ success: true, content });
            } else {
                sendResponse({ success: false, error: 'No post found' });
            }
        }
    } catch (error) {
        debug.error('Error handling message', error);
        sendResponse({ success: false, error: error.message });
    }
    
    return true; // Keep the message channel open for async response
});

// Start the extension
initialize(); 