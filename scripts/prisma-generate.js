const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Generates the Prisma client.
 *
 * Prisma normally downloads a platform-specific query engine during
 * generation. Some CI/sandbox environments cannot reach binaries.prisma.sh, so
 * we retry with placeholder engine paths. The application always supplies the
 * `@prisma/adapter-pg` driver adapter (lib/prisma.js), so queries run through
 * Prisma's WASM engine rather than a host-specific native binary. That engine
 * is what makes the client portable between Netlify's Debian build image and
 * its Amazon Linux serverless runtime.
 */
function generate(extraEnv = {}) {
  execSync("npx prisma generate", {
    stdio: "inherit",
    env: {
      ...process.env,
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
      ...extraEnv
    }
  });
}

function enableWasmEngine() {
  const clientDir = path.resolve(__dirname, "../node_modules/.prisma/client");
  const indexPath = path.join(clientDir, "index.js");
  const wasmJs = path.join(clientDir, "query_engine_bg.js");
  const wasmBin = path.join(clientDir, "query_engine_bg.wasm");

  if (!fs.existsSync(indexPath) || !fs.existsSync(wasmJs) || !fs.existsSync(wasmBin)) {
    return;
  }

  let source = fs.readFileSync(indexPath, "utf8");
  const marker = "config.engineWasm = undefined";
  if (!source.includes(marker)) {
    return;
  }

  const replacement = `config.engineWasm = {
  getRuntime: () => require("./query_engine_bg.js"),
  getQueryEngineWasmModule: async () => {
    return new WebAssembly.Module(fs.readFileSync(path.resolve(__dirname, "query_engine_bg.wasm")));
  }
};`;

  source = source.replace(marker, replacement);
  fs.writeFileSync(indexPath, source, "utf8");
  console.log("✔ Enabled Prisma WASM query engine for driver adapters");
}

try {
  generate();
} catch {
  console.warn(
    "[prisma-generate] Native engine download unavailable; retrying with WASM-only client generation."
  );
  generate({
    PRISMA_SCHEMA_ENGINE_BINARY: "/bin/true",
    PRISMA_QUERY_ENGINE_LIBRARY: "/bin/true",
    PRISMA_QUERY_ENGINE_BINARY: "/bin/true"
  });
}

enableWasmEngine();
