// scripts/bundle-mcp.cjs
const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");

const MCP_SOURCE = path.resolve(__dirname, "../../../Hyper-MCP");
const MCP_DEST = path.resolve(__dirname, "../mcp-server");

async function bundleMCP() {
  console.log("🧩 Bundling MCP server from:", MCP_SOURCE);
  if (!fs.existsSync(path.join(MCP_SOURCE, "dist"))) {
    console.error(
      `❌ MCP build folder not found! Run 'npm run build' in Hyper-MCP first. PATH ${path.join(
        MCP_SOURCE,
        "dist"
      )}`
    );
    process.exit(1);
  }

  await fs.remove(MCP_DEST);
  await fs.ensureDir(MCP_DEST);

  // Copy necessary parts
  await fs.copy(path.join(MCP_SOURCE, "dist"), path.join(MCP_DEST, "dist"));
  if (fs.existsSync(path.join(MCP_SOURCE, "bin"))) {
    await fs.copy(path.join(MCP_SOURCE, "bin"), path.join(MCP_DEST, "bin"));
  }
  await fs.copy(path.join(MCP_SOURCE, "package.json"), path.join(MCP_DEST, "package.json"));

  console.log("🚀 Copied dist, bin & package.json from ", MCP_SOURCE, "- Running npm install");

  console.log("📦 Installing MCP server dependencies...");
  execSync("npm install --omit=dev", { cwd: MCP_DEST, stdio: "inherit" });

  console.log("✅ MCP server bundled successfully into extension.");
}

bundleMCP().catch((err) => {
  console.error("Error bundling MCP server:", err);
  process.exit(1);
});
