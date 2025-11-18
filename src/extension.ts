import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcess } from "child_process";
import logger, {attachOutputChannel} from "./logger.js";

let serverProcess: ChildProcess | undefined;
let outputChannel: vscode.OutputChannel;
let startedShown = false;
let bridgePathGlobal: string;

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Hyper MCP Server");
  attachOutputChannel(outputChannel);

  const isCursor = vscode.env.appName.toLowerCase().includes("cursor");
  logger.debug(`🌐 Running inside ${isCursor ? "Cursor" : "VSCode"}`);

  // Notify activation
  logger.info("🔄 Activating Extension");
  setTimeout(() => {
    vscode.window.showInformationMessage("Hyper MCP Extension activated ⚡");
  }, 500);

  // Resolve bridge script path once
  bridgePathGlobal = path.resolve(__dirname, "..", "scripts", "server-bridge.cjs");
  logger.debug(`🔧 Bridge script path: ${bridgePathGlobal}`);

  // Register commands
  const startCmd = vscode.commands.registerCommand("hyperEx.startServer", () =>
    startServer(bridgePathGlobal, context)
  );
  const stopCmd = vscode.commands.registerCommand("hyperEx.stopServer", stopServer);
  context.subscriptions.push(startCmd, stopCmd);
  logger.debug(`🧩 Start & Stop command registered`);

  // Prewarm Node (light optimization)
  prewarmNode();
}

/**
 * Prewarm Node.js to reduce first-launch latency
 */
async function prewarmNode() {
  try {
    const warmup = spawn("node", ["-v"]);
    warmup.on("exit", () => {
      logger.debug("🧠 Node prewarmed for fast launch");
    });
  } catch (error: any) {
    logger.error(`❌ Prewarm failed: ${error.message}`);
  }
}

/**
 * Set up a VSCode terminal alias *after* the server starts.
 */
async function setupTerminalAlias(context: vscode.ExtensionContext) {
  logger.debug("⚙️ Setting up the terminal");
  const bridgePath = bridgePathGlobal;

  // Create/reuse a terminal specifically for CLI
  const terminal = vscode.window.createTerminal({
    name: "Hyper MCP CLI",
    shellPath: process.env.SHELL,
    env: { ...process.env }
  });

  // Define a local alias that runs the bridge
  terminal.sendText(`alias hyperex='node "${bridgePath}"'`);
  terminal.sendText(`echo "✅ Hyper MCP CLI ready — try: hyperex --version or hyperex --help"`);
  terminal.show(true);

  context.subscriptions.push(terminal);
  const msg = "🧩 Added Hyper MCP CLI alias to VSCode terminal (after server start)";
  logger.debug(msg);
}

/**
 * Start the MCP server via the bridge script
 */
async function startServer(bridgePath: string, context: vscode.ExtensionContext) {
  if (serverProcess) {
    vscode.window.showInformationMessage("Server is already running.");
    logger.info("⚠️ Server already running");
    return;
  }

  const cwd = path.dirname(bridgePath);
  const startTime = Date.now();

  if (!fs.existsSync(bridgePath)) {
    vscode.window.showErrorMessage(`Bridge script not found at: ${bridgePath} ❌`);
    logger.error(`❌ Bridge script not found at ${bridgePath}`);
    return;
  }

  outputChannel.show(true);
  logger.debug(`🚀 Launching MCP via bridge: ${bridgePath}`);
  logger.debug(`🔍 Working directory: ${cwd}`);

  try {
    // Spawn the bridge
    serverProcess = spawn("node", [bridgePath], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    logger.debug(`✅ Spawn initiated via bridge, serverProcess : ${serverProcess}`);

    serverProcess.on("spawn", () => {
      logger.debug(`🐢 MCP process spawned via bridge, waiting for mcp-server response..`);
    });

    serverProcess.stdout?.on("data", (data) => {
      logger.debug(data.toString());
      if (!startedShown) {
        startedShown = true;
        vscode.window.showInformationMessage("MCP Server Started ✅");
        logger.info("🔥 MCP Server started successfully");

        // ✅ Only after the server starts, add the CLI alias
        setupTerminalAlias(context);
      }
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      logger.error(`💥 [ERR] ${data.toString()}`);
    });

    serverProcess.on("exit", (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.debug(`\n⏱️ Server exited with code ${code} after ${duration}s`);
      vscode.window.showWarningMessage(`MCP Server exited`);
      serverProcess = undefined;
      startedShown = false;
    });
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to start server: ${error.message} ❌`);
    logger.error(`❌ Failed to start server: ${error.message}`);
  }
}

/**
 * Stop the MCP server if running
 */
async function stopServer() {
  if (serverProcess) {
    try {
      logger.info("🔄 Stopping server...");
      serverProcess.kill();
      vscode.window.showInformationMessage("MCP Server stopped 🛑");
      logger.debug("🛑 MCP Server stopped manually by user");
      serverProcess = undefined;
    } catch (err: any) {
      vscode.window.showErrorMessage(`Error stopping server: ${err.message} ❌`);
      logger.error(`❌ Error stopping server: ${err.message}`);
    }
  } else {
    vscode.window.showInformationMessage("No server running ❓");
    logger.info("⚠️ No server running");
  }
}

/**
 * Deactivate extension
 */
export function deactivate() {
  if (serverProcess) {
    try {
      serverProcess.kill();
      logger.info("💤 Server deactivated");
    } catch (err: any) {
      logger.error(`❌ Error deactivating server: ${err.message}`);
    }
  }
}
