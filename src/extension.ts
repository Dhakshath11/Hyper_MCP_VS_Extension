/**
 * @file extension.ts
 * @description Command for creating or updating the Hyper MCP server configuration (mcp.json) for VSCode or Cursor workspaces.
 *
 * This module provides a command to generate or update mcp.json, handling backup and update logic, and ensuring the MCP server binary is executable and properly referenced.
 *
 * @author Dhakshath Amin
 * @date 23 November 2025
 * @version 1.0.0
 *
 * @usage
 *   - Activate extension in VSCode
 *   - Use command palette: 'HyperEx: Create Server Config'
 *
 */
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

let output: vscode.OutputChannel;

/**
 * Activates the extension and registers the 'createServerConfig' command.
 * Sets up the output channel for logging extension activity.
 * @param context VSCode extension context
 */
export function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("Hyperexecute MCP Server");
  context.subscriptions.push(output);

  context.subscriptions.push(
    vscode.commands.registerCommand("hyperEx.createServerConfig", () =>
      createServerConfig(context)
    )
  );
  output.appendLine(`Hyperexecute Server Contexts Registered`);
}

/**
 * Deactivates the extension. Currently a no-op.
 */
export function deactivate() { }

/**
 * Create/update mcp.json for Cursor or VSCode
 *
 * Case 0 → mcp.json does NOT exist → create fresh file
 * Case 1 → mcp.json exists + correct entry already present → do nothing
 * Case 2 → mcp.json exists but entry missing OR path outdated → update entry only
 */
async function createServerConfig(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    vscode.window.showErrorMessage("Open a workspace first.");
    return;
  }

  let root = workspaceFolders[0].uri.fsPath;
  const extPath = context.extensionPath;

  // Absolute path of the MCP binary inside THIS extension version
  const binaryPath = path.join(extPath, "mcp-server", "mcp-server");
  output.appendLine(`Root Path at: ${root}`);
  //output.appendLine(`Extension Path at: ${extPath}`);
  output.appendLine(`Binary Path at: ${binaryPath}`);

  if (!fs.existsSync(binaryPath)) {
    vscode.window.showErrorMessage("HyperX MCP binary missing inside extension.");
    output.appendLine(`HyperX MCP binary missing inside extension.`);
    return;
  }

  // Ensure binary is executable
  fs.chmodSync(binaryPath, 0o755);

  // ───────────────────────────────────────────────
  //  Choose target directory: prefer .vscode > .cursor
  // ───────────────────────────────────────────────
  const isCursor = vscode.env.appName.toLowerCase().includes("cursor");
  output.appendLine(`Running inside ${isCursor ? "Cursor" : "VSCode"}`);
  if (isCursor) root = path.join(root, ".cursor");
  else
    root = path.join(root, ".vscode");
  fs.mkdirSync(root, { recursive: true });
  const mcpJsonPath = path.join(root, "mcp.json");
  output.appendLine(`MCP Json Path at: ${mcpJsonPath}`);

  // ───────────────────────────────────────────────
  // Prepare expected MCP config entry
  // ───────────────────────────────────────────────
  const newEntry = {
    command: binaryPath,
    cwd: ".",
    env: {},
    description: "HyperExecute MCP Server"
  };

  let mcpConfig: any = { mcpServers: {} };
  // ============================================================
  // CASE 0: mcp.json DOES NOT EXIST → CREATE FRESH FILE
  // ============================================================
  if (!fs.existsSync(mcpJsonPath)) {
    mcpConfig.mcpServers["mcp-server"] = newEntry;

    fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2), "utf8");

    vscode.window.showInformationMessage("HyperX MCP configured.");
    output.appendLine(`Created new mcp.json at: ${mcpJsonPath}`);
    return;
  }

  // ============================================================
  // CASE 1 & CASE 2 happen below because file exists:
  // we load & inspect it.
  // ============================================================
  try {
    mcpConfig = JSON.parse(fs.readFileSync(mcpJsonPath, "utf8"));
  } catch (err) {
    vscode.window.showErrorMessage("mcp.json is corrupted — cannot parse JSON.");
    output.appendLine(`mcp.json is corrupted — cannot parse JSON.`);
    return;
  }
  if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};
  const existing = mcpConfig.mcpServers["mcp-server"];

  // ============================================================
  // CASE 1: Entry exists AND is identical → DO NOTHING
  // ============================================================
  if (
    existing &&
    existing.command === newEntry.command &&
    existing.description === newEntry.description
  ) {
    vscode.window.showInformationMessage("HyperX MCP already configured.");
    return;
  }

  // ============================================================
  // CASE 2: Entry missing OR outdated → UPDATE ONLY THAT ENTRY
  // ============================================================
  mcpConfig.mcpServers["mcp-server"] = newEntry;
  fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2), "utf8");
  vscode.window.showInformationMessage("HyperX MCP successfully configured.");
  output.appendLine(`mcp.json updated at: ${mcpJsonPath}`);
}

