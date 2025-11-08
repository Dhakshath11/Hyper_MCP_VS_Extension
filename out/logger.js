"use strict";
/**
 * logger.ts
 *
 * Utility functions for persistent file-based logging in Node.js projects.
 *
 * Author: Dhakshath Amin
 * Date: 9 October 2025
 * Description:
 *   - Provides a single persistent log file: hyperex_mcp.log
 *   - Appends all logs with timestamp and log level (info, warn, debug, error)
 *   - File-only logging (no console output)
 *   - Includes cleanup method to remove log lines older than 7 days
 *
 * Key Features:
 * - Safe, append-only logging for audit and debugging
 * - Timestamped log entries for traceability
 * - Supports info, debug, warn, error levels
 * - Designed for use in LambdaTest/HyperExecute automation tools
 * - Example usage provided at the end of the file
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_FILE = path_1.default.join(__dirname, "..", "extension.log");
/**
 * Utility: Format current timestamp
 */
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace("T", " ").split(".")[0]; // e.g., 2025-10-05 18:45:12
}
/**
 * Utility: Extract the caller file and line number from stack trace
 */
function getCallerInfo() {
    const err = new Error();
    const stack = err.stack?.split("\n") || [];
    for (let i = 2; i < stack.length; i++) { // skip first 2 frames (Error + inside logger)
        const line = stack[i];
        if (!line.includes("logger")) {
            const match = line.match(/\(?(.+):(\d+):\d+\)?$/);
            if (match) {
                const filePath = match[1];
                const lineNum = match[2];
                return `${path_1.default.basename(filePath)}:${lineNum}`;
            }
        }
    }
    return "unknown:0";
}
/**
 * Utility: Write a message to the log file (no console)
 */
function writeLog(level, message, error) {
    const timestamp = getTimestamp();
    const caller = getCallerInfo();
    const formatted = `${timestamp} | ${level.padEnd(5)} | [${caller}] ${message}` +
        (error instanceof Error ? ` | ${error.stack || error.message}` : "") +
        "\n";
    // Append to file (create if not exists)
    fs_1.default.appendFileSync(LOG_FILE, formatted, { encoding: "utf-8" });
}
/**
 * Logger object
 */
const logger = {
    info: (msg) => writeLog("INFO", msg),
    debug: (msg) => writeLog("DEBUG", msg),
    warn: (msg) => writeLog("WARN", msg),
    error: (msg, err) => writeLog("ERROR", msg, err),
    /**
     * Cleanup log file: removes entries older than 7 days
     */
    cleanOldLogs: () => {
        if (!fs_1.default.existsSync(LOG_FILE))
            return;
        const lines = fs_1.default.readFileSync(LOG_FILE, "utf-8").split("\n").filter(Boolean);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const validLines = lines.filter((line) => {
            const timestampPart = line.split(" | ")[0];
            const lineDate = new Date(timestampPart);
            return !isNaN(lineDate.getTime()) && lineDate >= sevenDaysAgo;
        });
        fs_1.default.writeFileSync(LOG_FILE, validLines.join("\n") + "\n", "utf-8");
    },
};
exports.default = logger;
/**
 * 🧪 Example Usage:
 * -----------------
 * import logger from "./logger";
 *
 * logger.info("Server started");
 * logger.debug("Debugging MCP request");
 * logger.warn("Memory usage high");
 * logger.error("Database failed", new Error("Timeout"));
 *
 * // Run daily cleanup (for example in a cron or on app start)
 * logger.cleanOldLogs();
 */
//# sourceMappingURL=logger.js.map