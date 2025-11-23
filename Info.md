---

# **HyperEx Extension – Internal Architecture & Developer Notes**

This document explains the purpose of the core files inside the extension and how to debug the extension + MCP server in both **VS Code** and **Cursor**.

---

# **1. File Responsibilities**

## **📦 scripts/bundle-mcp.cjs**

**Purpose:**
This script runs during extension packaging (`npm run build:full`).
Its job is to **bundle the compiled MCP binary into the extension**.

### What it does:

1. Deletes any old binary inside `mcp-server/`.
2. Copies the freshly compiled MCP server from:

   ```
   Hyper-MCP/dist/mcp-server
   ```
3. Copies the `mcp-server.sha256` checksum file.
4. Applies executable permission:

   ```
   chmod 777 mcp-server
   ```
5. Ensures the extension always ships with a **clean, verified binary**.

### Why it exists:

* Guarantees the extension contains the correct version of your MCP engine.
* Prevents manual copying mistakes.
* Ensures the binary is executable on user systems.

---

## **🔗 scripts/server-bridge.cjs**

**Purpose:**
This is the **secure launcher** for the MCP binary.

### What it does:

1. Loads the binary path inside the extension.
2. Verifies SHA-256 integrity.
3. Spawns the MCP binary with:

   ```
   stdio: ["pipe", "pipe", "pipe"]
   ```

   This is **mandatory** for MCP spec.
4. Pipes:

   * `stdin` → into MCP server
   * MCP stdout → back to editor
   * stderr → diagnostic logs only
5. Never prints anything to stdout itself.

### Why it exists:

* MCP clients (Cursor/VS Code/AI agents) expect strict JSON output.
* A bridge layer prevents:

  * accidental logs
  * corrupted JSON
  * privilege escalation
  * binary tampering
* Also allows you to wrap future features (flags, analytics, versioning).

---

## **🧠 src/extension.ts**

**Purpose:**
This is the **core VS Code / Cursor extension logic**.

### Responsibilities:

1. Provide the command:

   ```
   HyperEx: Create Server Config
   ```
2. Detect `.cursor` or `.vscode` folder.
3. Create or update `mcp.json`.
4. Ensure the MCP binary has execute permissions.
5. Handle JSON merge logic safely (non-destructive).
6. Log to the **Hyperexecute MCP Server** output channel.

### Why it exists:

* Makes the MCP setup 100% automatic.
* Prevents users from manually writing absolute paths.
* Ensures extension upgrades don’t break existing workspaces.

---

# **2. Debugging the Extension**

## **A) Debugging in VS Code**

1. Create a `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Extension: Debug",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "code",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"]
    }
  ]
}
```

2. Press **F5** → opens a new VS Code window (Extension Host Window)
3. Run your command:

   ```
   HyperEx: Create Server Config
   ```

This lets you debug breakpoints inside:

* `extension.ts`
* your JSON logic
* file system operations

---

## **B) Debugging the Extension in Cursor**

Cursor supports the **same Extension Development Mode** as VS Code.

Run:

```sh
cursor --extensionDevelopmentPath=/absolute/path/to/hyperEx
```

This launches a second Cursor window running **your extension in dev mode**.

### Debug your extension:

1. Put breakpoints inside `extension.ts`
2. Open new Cursor Extension Window
3. Execute:

   ```
   HyperEx: Create Server Config
   ```

Breakpoints hit exactly the same as VS Code.

---

# **3. Debugging the MCP Server Binary**

If you want to debug the MCP server itself (not the extension):

### **Option 1 — Run binary directly**

```sh
./mcp-server --version
```

### **Option 2 — Run via bridge**

```sh
node scripts/server-bridge.cjs --version
```

### **Option 3 — MCP inspector (if compiled with Bun/Node inspector enable)**

```sh
node --inspect-brk ./mcp-server
```

If the binary was compiled via `pkg`, debugger support may be limited.

---

# **4. Summary**

| File                  | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| **bundle-mcp.cjs**    | Bundles & prepares MCP binary for extension             |
| **server-bridge.cjs** | Verifies + securely runs MCP binary                     |
| **extension.ts**      | Creates `mcp.json`, handles permissions, logs, commands |
| **mcp.json**          | Editor-level MCP integration file                       |
| **launch.json**       | Used by VS Code/Cursor for debugging extension          |

This is **clean**, **production-ready**, and future-proof.

---

If you want, I can also generate:

✅ A “Developer Handbook.pdf”
✅ A “How HyperEx Works Internally.md”
✅ Architecture diagram (ASCII or Figma-ready)
✅ Whitepaper for your company

Just ask.
