import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcess } from "child_process";
import logger from "./logger.js";

let serverProcess: ChildProcess | undefined;
let outputChannel: vscode.OutputChannel;
let cachedServerPath: string | undefined;
let startedShown = false;

export async function activate(context: vscode.ExtensionContext) {
  const isCursor = vscode.env.appName.toLowerCase().includes("cursor");
  logger.debug(`Running inside ${isCursor ? "Cursor" : "VSCode"}`);

  // Defer activation message slightly to avoid blocking VS Code startup
  logger.info("--- Activating Extension ---");
  setTimeout(() => {
    vscode.window.showInformationMessage("Hyper MCP Extension activated ⚡");
  }, 500);

  logger.debug("--- Activated Extension ---");
  outputChannel = vscode.window.createOutputChannel("Hyper MCP Server");

  // Pre-resolve and cache path (avoids delay later)
  cachedServerPath = path.resolve(__dirname, "..", "mcp-server", "dist", "main.js");
  logger.debug(`cached server path: ${cachedServerPath}`);

  // Register commands
  const startCmd = vscode.commands.registerCommand("hyperEx.startServer", startServer);
  const stopCmd = vscode.commands.registerCommand("hyperEx.stopServer", stopServer);
  context.subscriptions.push(startCmd, stopCmd);

  // Prewarm Node process silently to avoid cold-start delay
  prewarmNode();
}

/**
 * Quickly spawns a dummy Node process to reduce first real startup delay.
 */
async function prewarmNode() {
  try {
    const warmup = spawn("node", ["-v"]);
    warmup.on("exit", () => {
      outputChannel.appendLine("🧠 Node prewarmed for fast launch");
      logger.info(`Node prewarmed got launched`);
    });
  } catch (error: any) {
    // Ignore prewarm failure
    logger.debug(`cached server path: ${error.message}`);
  }
}

/**
 * Starts the MCP server efficiently with cached path & non-blocking spawn.
 */
async function startServer() {
  if (serverProcess) {
    vscode.window.showInformationMessage("Server is already running.");
    logger.info(`Server Already Running`);
    return;
  }

  const serverPath = cachedServerPath!;
  const cwd = path.dirname(serverPath);
  logger.debug(`cwd: ${cwd}`);
  const startTime = Date.now();

  if (!fs.existsSync(serverPath)) {
    vscode.window.showErrorMessage(`MCP server not found at: ${serverPath} ❌`);
    outputChannel.appendLine(`❌ Server not found at ${serverPath}`);
    logger.debug(`MCP server not found at: ${serverPath}`);
    return;
  }

  outputChannel.show(true);
  outputChannel.appendLine("🚀 Launching Hyper MCP Server...");
  outputChannel.appendLine(`Executable: ${serverPath}`);
  logger.debug(`Launching Hyper MCP Server at: ${serverPath}`);

  try {
    // Spawn the server detached for instant return
    serverProcess = spawn("node", [serverPath], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    logger.debug(`serverProcess: ${serverProcess}`);

    outputChannel.appendLine(`✅ Spawn initiated for MCP server at ${serverPath}`);

    serverProcess.on("spawn", () => {
      outputChannel.appendLine("🧠 MCP process spawned, waiting for logs...");
    });

    serverProcess.stdout?.on("data", (data) => {
      outputChannel.append(data.toString());
      if (!startedShown) {
        startedShown = true;
        vscode.window.showInformationMessage("MCP Server started successfully ✅");
        logger.info(`MCP Server started successfully`);
      }
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      outputChannel.append(`[ERR] ${data.toString()}`);
      logger.debug(`[ERR] ${data.toString()}`);
    });

    serverProcess.on("exit", (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      outputChannel.appendLine(`\n⏱️ Server exited with code ${code} after ${duration}s`);
      vscode.window.showWarningMessage(`MCP Server exited (code ${code})`);
      logger.debug(`Server exited with code ${code} at ${duration}s`);
      serverProcess = undefined;
      startedShown = false;
    });

  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to start server: ${error.message} ❌`);
    outputChannel.appendLine(`❌ Error: ${error.stack || error.message}`);
    logger.debug(`Failed to start server: ${error.message}`);
  }
}

/**
 * Stops the running MCP server, if active.
 */
async function stopServer() {
  if (serverProcess) {
    try {
      logger.info(`Going to stop server`);
      serverProcess.kill();
      vscode.window.showInformationMessage("MCP Server stopped 🛑");
      outputChannel.appendLine("🛑 MCP Server stopped manually by user");
      logger.debug(`Server Stopped`);
      serverProcess = undefined;
    } catch (err: any) {
      vscode.window.showErrorMessage(`Error stopping server: ${err.message} ❌`);
      outputChannel.appendLine(`❌ Stop error: ${err.stack || err.message}`);
      logger.debug(`Error stopping server: ${err.message}`);
    }
  } else {
    vscode.window.showInformationMessage("No server running❓");
    logger.debug(`No server running`);
  }
}

export function deactivate() {
  if (serverProcess) {
    try {
      serverProcess.kill();
      outputChannel.appendLine("Extension deactivated — server stopped 💤");
      logger.info(`Server Deactivated`);
    } catch (err: any) {
      // Ignore errors
      logger.debug(`Error deactivating server: ${err.message}`);
    }
  }
}
