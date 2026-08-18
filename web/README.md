# Langcrew AgentX: High-Performance, Extensible Frontend for AI Agents

**Langcrew AgentX** is a high-performance, extensible UI component library for building AI agent applications. Built with a modern frontend tech stack, it provides a core `AgentX` component, a powerful rendering engine, and a flexible action handling system that enables developers to quickly build production-grade, customizable agent interfaces.

[![NPM version](https://img.shields.io/npm/v/langcrew-agentx.svg)](https://www.npmjs.com/package/langcrew-agentx)

---

## 📖 Table of Contents

- [Core Concepts](#-core-concepts)
  - [1. The `AgentX` Component](#1-the-agentx-component)
  - [2. The Message Type Registry](#2-the-message-type-registry)
  - [3. The Widget System](#3-the-widget-system)
  - [4. Actions: Server vs. Client](#4-actions-server-vs-client)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Tech Stack](#-tech-stack)
- [License](#-license)

---

## 💡 Core Concepts

Understanding these four concepts is key to effectively using AgentX.

### 1. The `AgentX` Component

The `AgentX` component is the heart of the library. It's the main container that orchestrates the entire agent interface.

- **Main Entry Point:** It initializes the connection to your agent backend and provides the main chat UI.
- **State Management:** It sets up the global state (using Zustand) and makes it available to all child components.
- **Configuration:** You pass your backend endpoint, event handlers, and other configurations directly to this component.

```jsx
// Basic Usage
import AgentX from 'langcrew-agentx';
import 'langcrew-agentx/dist/index.css';

function MyAgentApp() {
  return (
    <div style={{ height: '100vh' }}>
      <AgentX chatEndpoint="https://your-agent-api.com/api/v1/chat" />
    </div>
  );
}
```

### 2. The Message Type Registry

The Message Type Registry allows you to **customize the appearance of messages in the chat stream**. Every message from the agent has a `type`. The registry lets you map these types to your own custom React components.

This is used for theming the chat, or for providing rich, custom UIs for specific tool calls and their results.

- **Extensible:** Register renderers for new, custom message types.
- **Flexible Matching:** Match message types using strings, arrays of strings, or regular expressions.
- **Default Fallback:** If no renderer is found for a message type, a default one is used.

#### Example: Creating a Custom Message Renderer

**1. Define your custom rendering component:**

```jsx
// src/components/CustomSearchRenderer.tsx
import React from 'react';
import { BriefRendererProps } from 'langcrew-agentx/dist/registry';

const CustomSearchRenderer: React.FC<BriefRendererProps> = ({ message }) => {
  return <div>🔍 Searching for: {message.content}</div>;
};

export default CustomSearchRenderer;
```

**2. Register it in your application's entry point:**

```jsx
// src/main.tsx
import { messageTypeRegistry } from 'langcrew-agentx';
import CustomSearchRenderer from './components/CustomSearchRenderer';

messageTypeRegistry.registerMessageType({
  type: 'web_search', // The message type to override
  briefRenderer: CustomSearchRenderer, // Your custom component
});
```

Now, all messages of type `web_search` will be rendered using your `CustomSearchRenderer` component.

### 3. The Widget System

While the Message Registry customizes the look of the chat stream, the **Widget System allows the agent to send fully interactive UI components to the frontend**.

The agent can send a description of a UI in JSON format or as a JSX string. AgentX then dynamically renders this as a React component. This allows the agent to create forms, display complex data, and build entire UIs on the fly.

- **Dynamic UI Generation:** The agent is no longer limited to text and markdown; it can now build and display rich interfaces.
- **Interactive Components:** The rendered widgets can have buttons, forms, and other interactive elements that can trigger actions.
- **Based on Standard Components:** The widget system uses a set of standard, battle-tested UI components like `Button`, `Input`, `Card`, `Chart`, etc.

The agent backend simply needs to send a message with a `type` starting with `widget` and include the UI definition in the payload.

### 4. Actions: Server vs. Client

Actions are triggered by user interactions with widgets (e.g., clicking a button). AgentX has a powerful action system that distinguishes between actions handled by the agent backend (`Server`) and those handled in the browser (`Client`).

- **Server Actions (The Default):** An action that is sent to the agent backend for processing. The agent then decides what to do next. This is for tasks that require the agent's intelligence, like running a script, querying a database, or calling an external API.

- **Client Actions & Client Tools:** These are actions executed entirely within the browser. They are further divided into two distinct types: `Client Action` and `Client Tool`.

Understanding their difference is crucial for building complex applications.

#### The Core Difference in One Sentence

> **Client Action** = Let the model trigger an **"operation function"** in your frontend.
> **Client Tool** = Let the model call a function with **structured I/O**, and return the result to the model for further reasoning.

---

### Client Action vs. Client Tool — The Complete Breakdown

#### 1. Different Purposes

- ✅ **Client Action**
  - **Purpose:** Primarily for triggering **UI or user interface operations**.
  - **Return Value:** It **does not** return a value to the model.
  - **Analogy:** A one-way message → the frontend executes it, and that's it.
  - **Common Uses:**
    - Open a login modal
    - Navigate to a different page
    - Show a notification
    - Scroll to a specific area

- ✅ **Client Tool**
  - **Purpose:** A function with **structured input and output**, designed to be called by the AI model.
  - **Return Value:** It **always** returns a result to the model, which the model uses to continue its reasoning process.
  - **Analogy:** The model makes a function call → the function executes → the result is returned to the model so the conversation can continue.
  - **Common Uses:**
    - Get the user's current location from the browser
    - Read a user-selected file
    - Interact with a browser extension
    - Perform a complex calculation on the client-side

#### 2. Comparison Table

| Feature                       | Client Action         | Client Tool             |
| ----------------------------- | --------------------- | ----------------------- |
| Has Structured Parameters?    | Optional              | ✅ **Required**         |
| Returns Result to Model?      | ❌ **No**             | ✅ **Yes**              |
| Model Can Reason on Result?   | ❌ No                 | ✅ **Yes**              |
| **Typical Use Case**          | **UI Behavior**       | **Logic/Data Behavior** |

#### 3. Usage Scenarios

- 🟦 **Client Action: Manipulating the User Interface**

  Let's say you want the model to be able to open a login popup.

  **1. Register the `Client Action`:**
  ```ts
  // In your app's entry point
  import { registerClientAction } from 'langcrew-agentx';

  registerClientAction('openLoginPopup', () => {
    showLoginModal(); // Your function to show a login modal
  });
  ```

  **2. The agent sends a widget that uses this action:**
  ```json
  {
    "type": "Button",
    "props": {
      "children": "Login",
      "onClick": {
        "type": "openLoginPopup",
        "handler": "client"
      }
    }
  }
  ```
  When the button is clicked, the `showLoginModal` function is executed. The model receives no feedback.

- 🟩 **Client Tool: Executing Reusable Logic and Returning a Result**

  Imagine you want the model to be able to get the user's current browser URL.

  **1. Register the `Client Tool`:**
  ```ts
  // In your app's entry point
  import { registerClientTool } from 'langcrew-agentx';

  registerClientTool('getCurrentUrl', () => {
    return { url: window.location.href };
  });
  ```

  **2. The model decides to call this tool:**
  The agent backend can now call the `getCurrentUrl` tool. The tool will execute in the browser, and the result (`{ "url": "https://..." }`) will be sent back to the model for its next step.

#### 4. Which One Should You Use?

- ❓ I want the model to control the UI or trigger a frontend behavior.
  - → **Use a Client Action**

- ❓ I need the model to run a tool, get a result, and use that result to continue its task.
  - → **Use a Client Tool**

#### 5. A Simple Analogy to Remember

| Analogy                                       | Type              |
| --------------------------------------------- | ----------------- |
| "Turn off the lights" → Execute, no feedback needed. | **Client Action** |
| "Tell me what's behind this door" → Need a result to decide what's next. | **Client Tool**   |

---

## ⚡ Getting Started

1.  **Install the package:**

    ```bash
    pnpm add langcrew-agentx
    ```

2.  **Import the `AgentX` component and its styles:**

    ```jsx
    import React from 'react';
    import AgentX from 'langcrew-agentx';
    import 'langcrew-agentx/dist/index.css';

    const App = () => {
      return (
        <div style={{ height: '100vh' }}>
          <AgentX
            chatEndpoint="https://your-agent-api.com/api/v1/chat"
            onNewMessage={(message) => {
              console.log('New message:', message);
            }}
          />
        </div>
      );
    };

    export default App;
    ```

---

## 📚 API Reference

### `AgentX` Component Props

| Prop Name         | Type                               | Description                                                                                             |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `chatEndpoint`    | `string`                           | The endpoint for your agent chat API.                                                                        |
| `fileUploadConfig`| `FileUploadConfig`                 | Configuration for file uploads.                                                                         |
| `onChunks`        | `(chunks: MessageChunk[]) => void` | Callback function that is called when new message chunks are received from the agent.                   |
| `onNewMessage`    | `(message: MessageItem) => void`   | Callback function that is called when a new message is created (e.g., user sends a message).            |
| `onToolsUpdate`   | `(tools: any[]) => void`           | Callback function that is called when the available tools are updated.                                  |

---

## 🛠 Tech Stack

| Module       | Technology    |
| ------------ | ------------- |
| Framework    | React 19      |
| UI Library   | Antd + AntD X |
| State Mgmt   | Zustand       |
| Build Tool   | Rspack        |
| Styling      | Tailwind CSS  |
| Package Mgmt | Pnpm          |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
