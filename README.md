

# **HyperEx — HyperExecute MCP Server**

### **MCP server integration for HyperExecute — fast, portable, and workspace-aware.**

A secure, zero-dependency, binary-powered MCP server packaged as a VS Code & Cursor extension.
HyperEx makes HyperExecute automation *plug-and-play* for modern editors by auto-configuring `mcp.json`, managing server execution, and staying fully compliant with the MCP protocol (stdin/stdout).

This extension is designed for **real engineering workflows**, not toy demos.

---

## 🚀 **Features**

* **🔥 Bundled MCP binary** — no runtime Node or dependency hell
* **⚡ Fast startup** via precompiled binary + micro bridge
* **📁 Workspace-aware config**

  * `.cursor/mcp.json` → Cursor
  * `.vscode/mcp.json` → VS Code
* **🤖 Auto-generate or update `mcp.json`** in one click
* **🔒 Secure execution**

  * SHA-256 integrity validation
  * No stdout pollution
  * Strict MCP-spec compliant streams
* **🛠 One command setup**

  * `HyperEx: Create Server Config`
* **📡 Works with Playwright and Karate test automation** through HyperExecute
* **🪵 Clean logs** via VS Code output channel
* **🎯 Zero configuration needed by the user**

---

## 📦 **Project Structure**

```
.
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts        # Main extension logic
│   ├── logger.ts           # Output channel logger
├── scripts/
│   ├── bundle-mcp.cjs      # Bundles binary + sets permissions
│   └── server-bridge.cjs   # Secure binary launcher
├── mcp-server/
│   ├── mcp-server          # Compiled MCP binary
│   └── mcp-server.sha256   # Integrity hash
└── out/
    └── extension.js        # Compiled output
```

---

## 🧩 **Installation**

### **VS Code**

```sh
vsce package
```

This creates:
`hyperex-x.x.x.vsix`

Then:

* Open VS Code
* Press **Cmd/Ctrl + Shift + P**
* Choose **Extensions: Install from VSIX**
* Select your generated file

### **Cursor**

```sh
cursor --install-extension hyperex-0.0.1.vsix
```

---

## ⚙️ **Commands**

| Command                           | Description                                           |
| --------------------------------- | ----------------------------------------------------- |
| **HyperEx: Create Server Config** | Generates/updates `mcp.json` and binds the MCP binary |

That's it — 1 command to fully integrate HyperExecute MCP.

---

## 🗂 **mcp.json Auto-Generation**

The extension automatically writes this:

```json
{
  "mcpServers": {
    "mcp-server": {
      "command": "/ABSOLUTE/PATH/TO/EXTENSION/mcp-server/mcp-server",
      "cwd": ".",
      "env": {},
      "description": "HyperExecute MCP Server"
    }
  }
}
```

Logic:

1. If no `mcp.json` → create new
2. If exists and same path → no change
3. If exists but outdated → replace only the entry
4. If file contains other MCP configs → leave them untouched

Supports:

* `.cursor/mcp.json` (Cursor)
* `.vscode/mcp.json` (VS Code)

---

## 🔐 **Security Architecture**

The MCP server binary is:

* Verified with SHA-256
* Executed via sandboxed bridge script
* Never logs or writes to stdout (required by MCP spec)
* Pipe-based stdin/stdout only
* Immune to tampering: extension bundles a fixed binary

This ensures deterministic operation across all machines.

---

## 🧱 **How the Binary Runs**

Flow:

```
VS Code / Cursor
      ↓
mcp.json → points to extension binary
      ↓
server-bridge.cjs
      ↓ verifies SHA-256
      ↓ spawns binary with strict stdio
      ↓

```

---

## 🛠 **Development**

### Build extension

```sh
npm run build:full
```

### Package

```sh
npm run package
```

### Dev mode

```sh
code --extensionDevelopmentPath=/path/to/hyperEx
```

### Bundle binary

```sh
npm run bundle:mcp
```

---

## 🧪 Debugging

All extension logs appear in:
**View → Output → Hyperexecute MCP Server**

---

## 📄 **License**

ISC
© 2025 Dhakshath Amin

---
