const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function findExistingBinary(prefix) {
  const dirs = [
    path.resolve(__dirname, "../node_modules/@prisma/engines"),
    path.resolve(__dirname, "../node_modules/.prisma/client")
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (f.startsWith(prefix)) {
        return path.join(d, f);
      }
    }
  }
  return null;
}

function run() {
  const existingLibEngine = findExistingBinary("libquery_engine-");
  const existingSchemaEngine = findExistingBinary("schema-engine-");
  const existingBinEngine = findExistingBinary("query-engine-");

  const env = { ...process.env };
  if (!existingLibEngine) {
    env.PRISMA_SCHEMA_ENGINE_BINARY = existingSchemaEngine || "/bin/true";
    env.PRISMA_QUERY_ENGINE_LIBRARY = "/bin/true";
    env.PRISMA_QUERY_ENGINE_BINARY = existingBinEngine || "/bin/true";
  }

  execSync("npx prisma generate", {
    stdio: "inherit",
    env
  });

  const clientDir = path.resolve(__dirname, "../node_modules/.prisma/client");
  const runtimeDir = path.resolve(
    __dirname,
    "../node_modules/@prisma/client/runtime"
  );

  const wasmJs = path.join(runtimeDir, "query_engine_bg.postgresql.js");
  const wasmBin = path.join(runtimeDir, "query_engine_bg.postgresql.wasm");

  if (fs.existsSync(wasmJs) && fs.existsSync(wasmBin) && fs.existsSync(clientDir)) {
    fs.copyFileSync(wasmJs, path.join(clientDir, "query_engine_bg.js"));
    fs.copyFileSync(wasmBin, path.join(clientDir, "query_engine_bg.wasm"));

    const indexPaths = [
      path.join(clientDir, "index.js"),
      path.join(clientDir, "default.js")
    ];

    for (const indexPath of indexPaths) {
      if (!fs.existsSync(indexPath)) continue;
      let content = fs.readFileSync(indexPath, "utf8");
      const target =
        "const PrismaClient = getPrismaClient(config)\nexports.PrismaClient = PrismaClient";

      const replacement = `config.engineWasm = {
  getRuntime: () => require("./query_engine_bg.js"),
  getQueryEngineWasmModule: async () => {
    return new WebAssembly.Module(fs.readFileSync(path.resolve(__dirname, "query_engine_bg.wasm")));
  }
};
const _BasePrismaClient = getPrismaClient(config);
const hasNativeEngine = fs.readdirSync(__dirname).some((f) => f.startsWith("libquery_engine-") && f.endsWith(".node") && fs.statSync(path.join(__dirname, f)).size > 1024);
class PrismaClient extends _BasePrismaClient {
  constructor(optionsArg = {}) {
    if (!hasNativeEngine && !optionsArg?.adapter) {
      const { Pool } = require("pg");
      const { PrismaPg } = require("@prisma/adapter-pg");
      const connStr =
        optionsArg?.datasources?.db?.url ||
        optionsArg?.datasourceUrl ||
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@127.0.0.1:5432/aurena_nails";
      const pool = new Pool({
        connectionString: connStr,
        max: 1,
        idleTimeoutMillis: 1000,
        allowExitOnIdle: true
      });
      pool.end = async () => {};
      const adapter = new PrismaPg(pool, { schema: "aurena" });
      super({ ...optionsArg, adapter });
      this.__pgPool = pool;
    } else {
      super(optionsArg);
    }
  }
}
exports.PrismaClient = PrismaClient`;

      if (content.includes(target)) {
        content = content.replace(target, replacement);
        fs.writeFileSync(indexPath, content, "utf8");
      }
    }
  }
}

run();
