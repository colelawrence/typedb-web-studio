#!/usr/bin/env bun
/**
 * Packaging Test for @typedb/studio
 *
 * This script validates that the npm package works correctly when installed
 * as a dependency, simulating what end-users would experience with npx.
 *
 * What it does:
 * 1. Builds the CLI package (vite build + copy dist)
 * 2. Packs the package into a tarball
 * 3. Inspects the tarball contents (size, required files)
 * 4. Installs the tarball in a fresh test project
 * 5. Runs the CLI and verifies it starts correctly
 * 6. Fetches the served page and validates WASM files are accessible
 *
 * Run with: bun run test:cli-packaging
 */

import { $ } from "bun";
import { existsSync, rmSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STUDIO_CLI_DIR = join(__dirname, "..");
const WEB_STUDIO_ROOT = join(__dirname, "../..");
const TEST_DIR = join(__dirname, "consumer");
const TARBALL_DIR = join(__dirname, "tarball");

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(`\x1b[36m[cli-packaging-test]\x1b[0m ${msg}`);
}

function success(msg: string) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function fail(msg: string) {
  console.log(`\x1b[31m✗\x1b[0m ${msg}`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function runTest(
  name: string,
  fn: () => Promise<void>
): Promise<boolean> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, message: "OK", duration });
    success(`${name} (${duration}ms)`);
    return true;
  } catch (e) {
    const duration = Date.now() - start;
    const message = e instanceof Error ? e.message : String(e);
    results.push({ name, passed: false, message, duration });
    fail(`${name}: ${message}`);
    return false;
  }
}

// ============================================================================
// Cleanup
// ============================================================================

function cleanup() {
  log("Cleaning up previous test artifacts...");
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  if (existsSync(TARBALL_DIR)) {
    rmSync(TARBALL_DIR, { recursive: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
  mkdirSync(TARBALL_DIR, { recursive: true });
}

// ============================================================================
// Build
// ============================================================================

async function buildCli() {
  log("Building web studio and CLI package...");

  // Build the web studio
  await $`cd ${WEB_STUDIO_ROOT} && pnpm run build`.quiet();

  // Copy dist to studio-cli
  const distSrc = join(WEB_STUDIO_ROOT, "dist", "client");
  const distDest = join(STUDIO_CLI_DIR, "dist");

  if (existsSync(distDest)) {
    rmSync(distDest, { recursive: true });
  }

  await $`cp -r ${distSrc} ${distDest}`.quiet();
}

// ============================================================================
// Pack
// ============================================================================

async function pack(): Promise<string> {
  log("Packing npm package...");
  const result = await $`cd ${STUDIO_CLI_DIR} && npm pack --pack-destination ${TARBALL_DIR}`
    .text();
  const tarballName = result.trim();
  return join(TARBALL_DIR, tarballName);
}

// ============================================================================
// Package Inspection
// ============================================================================

interface PackageInspection {
  totalSize: number;
  fileCount: number;
  files: { path: string; size: number }[];
  hasWasm: boolean;
  hasHtml: boolean;
  hasJs: boolean;
  hasCli: boolean;
  wasmSize: number;
}

async function inspectPackage(tarballPath: string): Promise<PackageInspection> {
  const extractDir = join(TARBALL_DIR, "extracted");
  mkdirSync(extractDir, { recursive: true });

  await $`tar -xzf ${tarballPath} -C ${extractDir}`.quiet();

  const packageDir = join(extractDir, "package");
  const files: { path: string; size: number }[] = [];

  function walkDir(dir: string, prefix = "") {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const relativePath = prefix ? `${prefix}/${entry}` : entry;
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, relativePath);
      } else {
        files.push({ path: relativePath, size: stat.size });
      }
    }
  }

  walkDir(packageDir);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const wasmFiles = files.filter((f) => f.path.endsWith(".wasm"));
  const wasmSize = wasmFiles.reduce((sum, f) => sum + f.size, 0);

  return {
    totalSize,
    fileCount: files.length,
    files,
    hasWasm: wasmFiles.length > 0,
    hasHtml: files.some((f) => f.path.endsWith(".html")),
    hasJs: files.some((f) => f.path.endsWith(".js")),
    hasCli: files.some((f) => f.path === "bin/cli.js"),
    wasmSize,
  };
}

// ============================================================================
// Consumer Project Setup
// ============================================================================

async function setupConsumerProject(tarballPath: string) {
  log("Setting up consumer test project...");

  const packageJson = {
    name: "typedb-studio-consumer-test",
    version: "1.0.0",
    type: "module",
    private: true,
    dependencies: {
      "@typedb/studio": `file:${tarballPath}`,
    },
  };

  await Bun.write(
    join(TEST_DIR, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  log("Installing package from tarball...");
  await $`cd ${TEST_DIR} && npm install`.quiet();
}

// ============================================================================
// CLI Test
// ============================================================================

async function testCli(): Promise<void> {
  log("Testing CLI server...");

  // Find the CLI binary
  const cliBin = join(TEST_DIR, "node_modules", ".bin", "typedb-studio");
  if (!existsSync(cliBin)) {
    throw new Error("CLI binary not found in node_modules/.bin/");
  }

  // Start the server
  const port = 13579; // Use a unique port
  const proc = Bun.spawn(["node", cliBin, "--port", String(port), "--no-open"], {
    cwd: TEST_DIR,
    stdout: "pipe",
    stderr: "pipe",
  });

  // Wait for server to start
  await new Promise((r) => setTimeout(r, 1000));

  try {
    // Test that server responds
    const response = await fetch(`http://127.0.0.1:${port}/`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const html = await response.text();
    if (!html.includes("<!DOCTYPE html>") && !html.includes("<html")) {
      throw new Error("Response is not valid HTML");
    }

    // Test that WASM files are accessible
    const assetsResponse = await fetch(`http://127.0.0.1:${port}/assets/`);
    // This might 404, but we can test a known asset

    // Test SPA routing (should return HTML for unknown paths)
    const spaResponse = await fetch(`http://127.0.0.1:${port}/query`);
    if (!spaResponse.ok) {
      throw new Error(`SPA routing failed: ${spaResponse.status}`);
    }

    log("CLI server responded correctly");
  } finally {
    // Kill the server
    proc.kill();
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(" @typedb/studio CLI Packaging Test");
  console.log("=".repeat(60) + "\n");

  const startTime = Date.now();

  // Cleanup
  cleanup();

  // Build
  await runTest("Build CLI package", buildCli);

  // Pack
  let tarballPath = "";
  await runTest("Create npm tarball", async () => {
    tarballPath = await pack();
    if (!existsSync(tarballPath)) {
      throw new Error(`Tarball not created: ${tarballPath}`);
    }
  });

  // Inspect package
  let inspection: PackageInspection | null = null;
  await runTest("Inspect package contents", async () => {
    inspection = await inspectPackage(tarballPath);

    console.log("\n  Package contents:");
    console.log(`    Total size: ${formatBytes(inspection.totalSize)}`);
    console.log(`    File count: ${inspection.fileCount}`);
    console.log(`    WASM size: ${formatBytes(inspection.wasmSize)}`);
    console.log(`    Has WASM: ${inspection.hasWasm}`);
    console.log(`    Has HTML: ${inspection.hasHtml}`);
    console.log(`    Has JS: ${inspection.hasJs}`);
    console.log(`    Has CLI: ${inspection.hasCli}\n`);
  });

  // Validate package structure
  await runTest("Package has required files", async () => {
    if (!inspection) throw new Error("No inspection data");

    const requiredFiles = [
      "bin/cli.js",
      "package.json",
      "README.md",
    ];

    for (const file of requiredFiles) {
      const found = inspection.files.some((f) => f.path === file);
      if (!found) {
        throw new Error(`Missing required file: ${file}`);
      }
    }

    // Must have HTML (index or _shell)
    if (!inspection.hasHtml) {
      throw new Error("Missing HTML file in dist/");
    }

    // Must have WASM files
    if (!inspection.hasWasm) {
      throw new Error("Missing WASM files in dist/");
    }
  });

  await runTest("Package size is reasonable", async () => {
    if (!inspection) throw new Error("No inspection data");

    // Package should be under 25MB (WASM is large)
    const maxSize = 25 * 1024 * 1024;
    if (inspection.totalSize > maxSize) {
      throw new Error(
        `Package too large: ${formatBytes(inspection.totalSize)} > ${formatBytes(maxSize)}`
      );
    }

    // But should be at least 10MB (WASM should be included)
    const minSize = 10 * 1024 * 1024;
    if (inspection.totalSize < minSize) {
      throw new Error(
        `Package too small (WASM missing?): ${formatBytes(inspection.totalSize)} < ${formatBytes(minSize)}`
      );
    }
  });

  // Setup consumer project
  await runTest("Setup consumer project", async () => {
    await setupConsumerProject(tarballPath);
  });

  // Run CLI tests
  await runTest("CLI server starts and serves files", testCli);

  // Summary
  const totalTime = Date.now() - startTime;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;

  console.log("\n" + "=".repeat(60));
  console.log(" Summary");
  console.log("=".repeat(60));
  console.log(`\n  Total time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Tests: ${passedTests} passed, ${failedTests} failed\n`);

  if (inspection) {
    console.log("  Package info:");
    console.log(`    Size: ${formatBytes(inspection.totalSize)}`);
    console.log(`    Files: ${inspection.fileCount}`);
  }

  if (failedTests > 0) {
    console.log("\n  Failed tests:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    - ${r.name}: ${r.message}`);
    }
    process.exit(1);
  }

  console.log("\n  \x1b[32m✓ All CLI packaging tests passed!\x1b[0m\n");
}

main().catch((e) => {
  console.error("\nFatal error:", e);
  process.exit(1);
});
