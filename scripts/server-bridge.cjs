#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const mcpPath = path.resolve(__dirname, "../mcp-server/dist/main.js");

if (!fs.existsSync(mcpPath)) {
  console.error("❌ MCP build not found. Please run: npm run build:full");
  process.exit(1);
}

const args = process.argv.slice(2);
const child = spawn("node", [mcpPath, ...args], { stdio: "inherit" });
