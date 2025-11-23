
/**
 * bundle-mcp.cjs
 *
 * Reliable, production-grade MCP server bundler for the HyperExecute VS Code extension.
 *
 * Author: Dhakshath Amin
 * Date: 21 November 2025
 * 
 * This script bundles the compiled MCP binary into the VS Code extension.
 * It removes the old server bundle, copies the new compiled binary +
 * checksum, and ensures the server executable has the correct permissions.
 */

const fs = require("fs-extra");
const path = require("path");

const MCP_SOURCE = path.resolve(__dirname, "../../../Hyper-MCP/dist");          // Absolute path where Hyper-MCP build output lives
const MCP_DEST = path.resolve(__dirname, "../mcp-server");                      // Destination inside the extension where the MCP binary will be placed

async function bundleMCP() {
  console.log("🧩 Bundling MCP server from:", MCP_SOURCE);

  // Validate source folder exists
  if (!fs.existsSync(MCP_SOURCE)) {
    console.error(
      `❌ MCP build folder not found! Run 'npm run build:secure' in Hyper-MCP first. PATH: ${MCP_SOURCE}`
    );
    process.exit(1);
  }

  // Clean destination folder
  await fs.remove(MCP_DEST);
  await fs.ensureDir(MCP_DEST);

  // Paths for source files
  const binarySrc = path.join(MCP_SOURCE, "mcp-server");
  const checksumSrc = path.join(MCP_SOURCE, "mcp-server.sha256");

  // Paths for destination files
  const binaryDest = path.join(MCP_DEST, "mcp-server");
  const checksumDest = path.join(MCP_DEST, "mcp-server.sha256");

  // Copy binary + checksum
  await fs.copyFile(binarySrc, binaryDest);
  await fs.copyFile(checksumSrc, checksumDest);

  console.log("🚀 Copied bundled binary from:", MCP_SOURCE);

  // Make executable - Both (Binary & server-bridge.cjs) files needs to be executable
  await fs.chmod(binaryDest, 0o777);

  console.log("🚀 Executable permissions applied");
  console.log("✅ MCP binary successfully bundled into extension");
}

// Run and catch errors
bundleMCP().catch((err) => {
  console.error("Error bundling MCP server:", err);
  process.exit(1);
});
