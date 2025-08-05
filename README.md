# LinkedIn Comment Generator Chrome Extension

A Chrome extension that helps you generate professional comments for LinkedIn posts with customizable tones.

## Features

- Automatically detects LinkedIn posts in your feed
- Adds a "Generate Comment" button to every post
- Generates relevant, contextual comments based on post content
- Supports multiple tones: Professional, Friendly, Enthusiastic, Analytical, and more
- One-click copy to clipboard functionality
- Modern and user-friendly interface

## Installation

### From Chrome Web Store (Recommended)
1. Navigate to the extension in the Chrome Web Store
2. Click "Add to Chrome"
3. Confirm by clicking "Add extension"

### Manual Installation (For Developers)
1. Clone this repository or download the files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

### Directly on LinkedIn:
1. Navigate to LinkedIn and look for the "✨ Generate Comment" button next to each post
2. Click the button to open the comment generator
3. (Optional) Add hints or select a tone for your comment
4. Click "Generate" to create a comment
5. Use the copy button to copy the comment to your clipboard
6. Paste the comment into LinkedIn's comment box

### Using the Popup:
1. Click the extension icon in your Chrome toolbar
2. The extension will automatically detect the current post
3. Add optional hints or select a tone
4. Click "Generate" to create a comment
5. Click "Copy" to copy the comment to your clipboard

## Configuration

The extension is configured to use the OpenAI API. To use it, you need to provide your own API key.

1. Open `manifest.json`
2. Find the `env` object
3. Replace `<YOUR_KEY>` with your actual OpenAI API key

### Security Note

**Do not ship the extension with your API key hard-coded in `manifest.json`**. For production use, it is recommended to use a proxy server to handle API requests securely or implement OAuth flows for user-based authentication.

## Development

### Project Structure
- `manifest.json` - Extension configuration
- `content.js` - Main content script that injects UI into LinkedIn
- `popup.html/js` - Popup interface 
- `background.js` - Background service worker
- `icons/` - Extension icons

### Build & Test
1. Make your changes to the code
2. Load the extension in developer mode as described in the installation section
3. Use the debug mode (Ctrl+Shift+D on LinkedIn) to see detailed logs

## Requirements

- Chrome browser (version 88 or later recommended)
- Active internet connection for API calls
- LinkedIn account

## Privacy

This extension:
- Only works on LinkedIn.com
- Only accesses data on the current page
- Transmits post content to the API for comment generation
- Does not store any user data outside of local storage

## License

MIT 