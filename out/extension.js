"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const logger_js_1 = __importDefault(require("./logger.js"));
let serverProcess;
let outputChannel;
let cachedServerPath;
let startedShown = false;
async function activate(context) {
    // Defer activation message slightly to avoid blocking VS Code startup
    logger_js_1.default.info("--- Activating Extension ---");
    setTimeout(() => {
        vscode.window.showInformationMessage("Hyper MCP Extension activated ⚡");
    }, 500);
    logger_js_1.default.debug("--- Activated Extension ---");
    outputChannel = vscode.window.createOutputChannel("Hyper MCP Server");
    // Pre-resolve and cache path (avoids delay later)
    cachedServerPath = path.resolve(__dirname, "..", "mcp-server", "dist", "main.js");
    logger_js_1.default.debug(`cached server path: ${cachedServerPath}`);
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
        const warmup = (0, child_process_1.spawn)("node", ["-v"]);
        warmup.on("exit", () => {
            outputChannel.appendLine("🧠 Node prewarmed for fast launch");
            logger_js_1.default.info(`"Node prewarmed got launched`);
        });
    }
    catch (error) {
        // Ignore prewarm failure
        logger_js_1.default.debug(`cached server path: ${error.message}`);
    }
}
/**
 * Starts the MCP server efficiently with cached path & non-blocking spawn.
 */
async function startServer() {
    const isCursor = vscode.env.appName?.toLowerCase().includes("cursor");
    if (isCursor) {
        vscode.window.showWarningMessage("⚠️ Cursor does not allow starting local servers. Please run MCP manually via terminal.");
        return;
    }
    if (serverProcess) {
        vscode.window.showInformationMessage("Server is already running.");
        logger_js_1.default.info(`Server Already Running`);
        return;
    }
    const serverPath = cachedServerPath;
    const cwd = path.dirname(serverPath);
    logger_js_1.default.debug(`cwd: ${cwd}`);
    const startTime = Date.now();
    if (!fs.existsSync(serverPath)) {
        vscode.window.showErrorMessage(`MCP server not found at: ${serverPath} ❌`);
        outputChannel.appendLine(`❌ Server not found at ${serverPath}`);
        logger_js_1.default.debug(`MCP server not found at: ${serverPath}`);
        return;
    }
    outputChannel.show(true);
    outputChannel.appendLine("🚀 Launching Hyper MCP Server...");
    outputChannel.appendLine(`Executable: ${serverPath}`);
    logger_js_1.default.debug(`Launching Hyper MCP Server at: ${serverPath}`);
    try {
        // Spawn the server detached for instant return
        serverProcess = (0, child_process_1.spawn)("node", [serverPath], {
            cwd,
            stdio: ["ignore", "pipe", "pipe"],
        });
        logger_js_1.default.debug(`serverProcess: ${serverProcess}`);
        outputChannel.appendLine(`✅ Spawn initiated for MCP server at ${serverPath}`);
        serverProcess.on("spawn", () => {
            outputChannel.appendLine("🧠 MCP process spawned, waiting for logs...");
        });
        serverProcess.stdout?.on("data", (data) => {
            outputChannel.append(data.toString());
            if (!startedShown) {
                startedShown = true;
                vscode.window.showInformationMessage("MCP Server started successfully ✅");
                logger_js_1.default.info(`MCP Server started successfully`);
            }
        });
        serverProcess.stderr?.on("data", (data) => {
            outputChannel.append(`[ERR] ${data.toString()}`);
            logger_js_1.default.debug(`[ERR] ${data.toString()}`);
        });
        serverProcess.on("exit", (code) => {
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            outputChannel.appendLine(`\n⏱️ Server exited with code ${code} after ${duration}s`);
            vscode.window.showWarningMessage(`MCP Server exited (code ${code})`);
            logger_js_1.default.debug(`Server exited with code ${code} at ${duration}s`);
            serverProcess = undefined;
            startedShown = false;
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to start server: ${error.message} ❌`);
        outputChannel.appendLine(`❌ Error: ${error.stack || error.message}`);
        logger_js_1.default.debug(`Failed to start server: ${error.message}`);
    }
}
/**
 * Stops the running MCP server, if active.
 */
async function stopServer() {
    if (serverProcess) {
        try {
            logger_js_1.default.info(`Going to stop server`);
            serverProcess.kill();
            vscode.window.showInformationMessage("MCP Server stopped 🛑");
            outputChannel.appendLine("🛑 MCP Server stopped manually by user");
            logger_js_1.default.debug(`Server Stopped`);
            serverProcess = undefined;
        }
        catch (err) {
            vscode.window.showErrorMessage(`Error stopping server: ${err.message} ❌`);
            outputChannel.appendLine(`❌ Stop error: ${err.stack || err.message}`);
            logger_js_1.default.debug(`Error stopping server: ${err.message}`);
        }
    }
    else {
        vscode.window.showInformationMessage("No server running❓");
        logger_js_1.default.debug(`No server running`);
    }
}
function deactivate() {
    if (serverProcess) {
        try {
            serverProcess.kill();
            outputChannel.appendLine("Extension deactivated — server stopped 💤");
            logger_js_1.default.info(`Server Deactivated`);
        }
        catch (err) {
            // Ignore errors
            logger_js_1.default.debug(`Error deactivating server: ${err.message}`);
        }
    }
}
//# sourceMappingURL=extension.js.map