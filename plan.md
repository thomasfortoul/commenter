### Project Plan: Overhaul Comment Generation System

The goal of this project is to replace the existing single "Generate Comment" button with a more sophisticated, user-centric system that offers three distinct comment styles: Controversial, Casual, and Excited.

#### 1. Core Objective

Transform the comment generation feature from a single-button action into a two-step process. First, the user clicks a primary "Generate" button, which then reveals three distinct style options. Each option will trigger a request to the OpenAI API with a unique, carefully crafted prompt to generate a comment in the desired tone and format.

#### 2. Architectural Changes

The implementation will be divided into two main areas: frontend modifications in `content.js` and backend logic updates in `background.js`.

##### **Frontend (`content.js`)**

1.  **Button Redesign:**
    *   The primary "✨ Generate Comment" button's behavior will be changed. Instead of directly generating a comment, it will now act as a toggle to show/hide a new container with the three style options.
    *   Three new buttons will be created:
        *   **"Controversial"**: Generates a unique, thought-provoking perspective.
        *   **"Casual"**: Creates a short, informal, and friendly remark.
        *   **"Excited"**: Produces an enthusiastic and original congratulatory message.

2.  **UI Interaction Flow:**
    *   A container for the three new buttons will be added next to the main "Generate Comment" button, initially hidden.
    *   Clicking the main button will reveal this container, allowing the user to choose a style.
    *   Clicking one of the style buttons will trigger the comment generation process.

##### **Backend (`background.js`)**

1.  **Prompt Engineering:**
    *   The `sendOpenAIRequest` function will be updated to accept a `promptType` parameter (`'controversial'`, `'casual'`, or `'excited'`).
    *   Three new system prompts will be engineered based on your detailed requirements for each comment style. This is the most critical part for achieving the desired human-like quality.

2.  **Dynamic Prompt Selection:**
    *   The `onMessage` listener in the background script will be modified to receive the `promptType` from `content.js`.
    *   A helper function will select the appropriate system prompt based on the `promptType` before sending the request to the OpenAI API.

#### 3. Mermaid Diagram: New Workflow

```mermaid
graph TD
    A[User sees '✨ Generate Comment' button on a post] --> B{User clicks '✨ Generate Comment'};
    B --> C[Three new buttons appear: 'Controversial', 'Casual', 'Excited'];
    C --> D{User selects a style};
    D --> E[content.js sends message to background.js with post content AND selected style];
    E --> F[background.js selects the correct prompt based on style];
    F --> G[background.js calls OpenAI API];
    G --> H[OpenAI returns a comment];
    H --> I[Comment is inserted into the comment box];