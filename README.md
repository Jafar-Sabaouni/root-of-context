# root-of-context

**Giving AI coding agents the bigger picture.**

## The Vision

The main issue with AI coding agents today is that they suffer from severe tunnel vision. When thrown into a large, complex codebase, they simply cannot see the bigger picture. They look at a single file and start making changes, completely blind to how that code interacts with the hundreds of other components in the system.

Because of this missing context, AI agents often invent bad solutions, ignore existing tools, and accidentally break parts of the app they didn't even know existed.

This project aims to fix that. **root-of-context** is built to give AI agents the architectural awareness of a lead developer. We are transforming AI from a blind text-generator into a deeply context-aware teammate that understands the physical wiring, the hidden meaning, and the history of your entire project.

## The Goals

We are building a custom, high-speed command center designed exclusively for how an AI "thinks". Rather than forcing the AI to guess how a large project works, **root-of-context** provides an AI-optimized query language to instantly uncover the truth of the codebase.

## Setup & Installation

To use **root-of-context**, you attach it directly to an AI code editor or CLI agent that supports the **Model Context Protocol (MCP)**, such as Claude Code or Cursor.

### 1. Build the project

Clone and build the project in your desired directory:

```bash
npm install
npm run build
```

### 2. Connect to your AI Editor

**For Cursor:**

1. Open Cursor Settings (Cmd + Shift + J)
2. Navigate to **Features** -> **MCP Servers**
3. Click **+ Add new MCP server**
4. Set Name to `root-of-context`
5. Set Type to `command`
6. Set Command to: `node /absolute/path/to/root-of-context/dist/index.js`
7. Click **Save**

**For VS Code (GitHub Copilot):**

1. Open VS Code Settings (`Cmd + ,`)
2. Search for `github.copilot.mcp.codeLenses` and enable if needed
3. Open your VS Code `settings.json`
4. Add the following MCP configuration:

```json
"github.copilot.mcp.servers": {
  "root-of-context": {
    "command": "node",
    "args": ["/absolute/path/to/root-of-context/dist/index.js"]
  }
}
```

**For Claude Code:**
Add the server globally via CLI:

```bash
claude mcp add root-of-context node /absolute/path/to/root-of-context/dist/index.js
```

**For Gemini CLI:**
Add the server globally via CLI:

```bash
gemini mcp add root-of-context node /absolute/path/to/root-of-context/dist/index.js
```

**For Antigravity:**
Antigravity automatically discovers MCP servers in its path. You can also explicitly configure it by providing the absolute path to the compiled `dist/index.js` Node script based on your local runtime configuration.

## How the AI uses it

Once connected, your AI automatically gains access to a single powerful tool called `query_codebase_context`. **You do not need to explicitly ask the AI to use it.** The AI will autonomously decide when it needs more context about your codebase before writing code.

**Behind the Scenes:**
The first time the AI triggers a query, `root-of-context` will automatically scan the project you are working in. It uses a quantized LLM model and tree-sitter to parse your AST, compute vector embeddings entirely locally, and build a local `.root-index` cache database inside your project. Subsequent queries execute in milliseconds.

Here is how the AI uses it:

- **Preventing Breakages:** When asked to modify a core file (like `auth.ts`), the AI might autonomously run `target("auth.ts").blast_radius()` to ensure its changes won't break dependent systems.
- **Understanding Architecture:** When tasked with updating a concept (like "User models"), the AI might run `search("User model").depends_on()` to map out the relevant files before writing a single line of code.
- **Learning from the Past:** When the AI encounters a strange design choice or complex logic, it can autonomously run `target("database.ts").history(3)` to read the exact git commit patches and understand _why_ the previous developers wrote it that way.
