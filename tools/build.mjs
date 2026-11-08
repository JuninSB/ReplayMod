import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeModules = path.join(root, "node_modules");
const packageName = `typescript-${process.platform}-${process.arch}`;
const nativePackage = path.join(nodeModules, "@typescript", packageName);
const compilerName = process.platform === "win32" ? "tsc.exe" : "tsc";
const nativeCompiler = path.join(nativePackage, "lib", compilerName);
const args = ["-p", path.join(root, "tsconfig.json")];

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) return result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return null;
}

async function privateCompiler() {
  const version = JSON.parse(
    await fs.readFile(path.join(nodeModules, "typescript", "package.json"), "utf8"),
  ).version;
  const cache = path.join(
    os.homedir(),
    ".cache",
    "replay-mod",
    `typescript-${version}-${process.platform}-${process.arch}`,
  );
  await fs.mkdir(cache, { recursive: true });
  const executable = path.join(cache, compilerName);
  const sourceExecutable = path.join(nativePackage, "lib", compilerName);
  let copyNeeded = true;
  try {
    const [sourceStat, cachedStat] = await Promise.all([
      fs.stat(sourceExecutable),
      fs.stat(executable),
    ]);
    copyNeeded = sourceStat.size !== cachedStat.size;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (copyNeeded) {
    await fs.cp(path.join(nativePackage, "lib"), cache, {
      recursive: true,
      force: true,
    });
  }
  if (process.platform !== "win32") await fs.chmod(executable, 0o755);
  return executable;
}

async function main() {
  let error = run(nativeCompiler, args);
  if (error?.code === "EACCES" || error?.code === "EPERM") {
    error = run(await privateCompiler(), args);
  }
  if (error) {
    console.error(`Could not run the TypeScript compiler: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const copy = run(process.execPath, [path.join(root, "tools/copy-three.mjs")]);
  if (copy) {
    console.error(`Could not stage Three.js: ${copy.message}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
