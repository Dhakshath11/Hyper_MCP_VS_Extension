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

import fs from "fs";
import path from "path";

const LOG_FILE = path.join(__dirname,"..", "extension.log");

type LogLevel = "INFO" | "DEBUG" | "WARN" | "ERROR";

/**
 * Utility: Format current timestamp
 */
function getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace("T", " ").split(".")[0]; // e.g., 2025-10-05 18:45:12
}

/**
 * Utility: Extract the caller file and line number from stack trace
 */
function getCallerInfo(): string {
    const err = new Error();
    const stack = err.stack?.split("\n") || [];

    for (let i = 2; i < stack.length; i++) { // skip first 2 frames (Error + inside logger)
        const line = stack[i];
        if (!line.includes("logger")) {
            const match = line.match(/\(?(.+):(\d+):\d+\)?$/);
            if (match) {
                const filePath = match[1];
                const lineNum = match[2];
                return `${path.basename(filePath)}:${lineNum}`;
            }
        }
    }
    return "unknown:0";
}

/**
 * Utility: Write a message to the log file (no console)
 */
function writeLog(level: LogLevel, message: string, error?: unknown) {
    const timestamp = getTimestamp();
    const caller = getCallerInfo();
    const formatted =
        `${timestamp} | ${level.padEnd(5)} | [${caller}] ${message}` +
        (error instanceof Error ? ` | ${error.stack || error.message}` : "") +
        "\n";

    // Append to file (create if not exists)
    fs.appendFileSync(LOG_FILE, formatted, { encoding: "utf-8" });
}

/**
 * Logger object
 */
const logger = {
    info: (msg: string) => writeLog("INFO", msg),
    debug: (msg: string) => writeLog("DEBUG", msg),
    warn: (msg: string) => writeLog("WARN", msg),
    error: (msg: string, err?: unknown) => writeLog("ERROR", msg, err),

    /**
     * Cleanup log file: removes entries older than 7 days
     */
    cleanOldLogs: () => {
        if (!fs.existsSync(LOG_FILE)) return;

        const lines = fs.readFileSync(LOG_FILE, "utf-8").split("\n").filter(Boolean);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const validLines = lines.filter((line) => {
            const timestampPart = line.split(" | ")[0];
            const lineDate = new Date(timestampPart);
            return !isNaN(lineDate.getTime()) && lineDate >= sevenDaysAgo;
        });

        fs.writeFileSync(LOG_FILE, validLines.join("\n") + "\n", "utf-8");
    },
};

export default logger;

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
