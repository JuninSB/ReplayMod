#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const rootArg = args.find((arg) => !arg.startsWith("--"));
const root = path.resolve(rootArg || path.join(scriptDir, ".."));
const oldContent = path.join(root, "content");
const clientAssets = path.join(root, "client-assets");
const assetDelivery = path.join(root, "assetdelivery");

function log(action, source, destination) {
  console.log(`${dryRun ? "[dry-run] " : ""}${action}: ${source}${destination ? ` -> ${destination}` : ""}`);
}

async function sameFile(source, destination) {
  try {
    const [sourceStat, destinationStat] = await Promise.all([
      fs.stat(source),
      fs.stat(destination),
    ]);
    if (!sourceStat.isFile() || !destinationStat.isFile()) return false;
    if (sourceStat.size !== destinationStat.size) return false;
    const [sourceBytes, destinationBytes] = await Promise.all([
      fs.readFile(source),
      fs.readFile(destination),
    ]);
    return sourceBytes.equals(destinationBytes);
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function moveEntry(source, destination) {
  const stat = await fs.lstat(source);
  if (stat.isSymbolicLink()) {
    throw new Error(`Refusing to migrate a symbolic link: ${source}`);
  }
  if (stat.isDirectory()) {
    if (!dryRun) await fs.mkdir(destination, { recursive: true });
    for (const name of await fs.readdir(source)) {
      await moveEntry(path.join(source, name), path.join(destination, name));
    }
    log("merge directory", source, destination);
    if (!dryRun) await fs.rmdir(source);
    return;
  }
  if (!stat.isFile()) throw new Error(`Unsupported filesystem entry: ${source}`);
  try {
    await fs.lstat(destination);
    if (!(await sameFile(source, destination))) {
      throw new Error(`Destination exists with different contents: ${destination}`);
    }
    log("remove duplicate", source, destination);
    if (!dryRun) await fs.unlink(source);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    log("move file", source, destination);
    if (!dryRun) {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.rename(source, destination);
    }
  }
}

function cacheBucket(contentType, filename) {
  const type = contentType.toLowerCase();
  const ext = path.extname(filename).toLowerCase();
  if (type.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".dds", ".tga"].includes(ext)) {
    return "textures";
  }
  if (type.startsWith("model/") || [".obj", ".mesh", ".glb", ".gltf"].includes(ext)) {
    return "meshes";
  }
  if (type.startsWith("audio/") || [".mp3", ".ogg", ".wav", ".m4a", ".flac"].includes(ext)) {
    return "audio";
  }
  return "other";
}

async function moveLegacyCache() {
  const sourceDir = path.join(oldContent, "cache", "node");
  let entries;
  try {
    entries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  const names = new Set(entries.map((entry) => entry.name));
  const processed = new Set();
  for (const entry of entries) {
    if (processed.has(entry.name)) continue;
    const source = path.join(sourceDir, entry.name);
    if (entry.name.endsWith(".type")) {
      const dataName = entry.name.slice(0, -5);
      if (names.has(dataName)) continue;
      log("leave orphan cache metadata", source);
      continue;
    }
    if (!entry.isFile()) {
      const destination = path.join(assetDelivery, "other", entry.name);
      await moveEntry(source, destination);
      processed.add(entry.name);
      continue;
    }

    const metadataName = `${entry.name}.type`;
    let contentType = "";
    if (names.has(metadataName)) {
      contentType = (await fs.readFile(path.join(sourceDir, metadataName), "utf8")).trim();
    }
    const bucket = cacheBucket(contentType, entry.name);
    const destination = path.join(assetDelivery, bucket, entry.name);
    await moveEntry(source, destination);
    processed.add(entry.name);
    if (names.has(metadataName)) {
      await moveEntry(
        path.join(sourceDir, metadataName),
        `${destination}.type`,
      );
      processed.add(metadataName);
    }
  }
  if (!dryRun) {
    try {
      await fs.rmdir(sourceDir);
      await fs.rmdir(path.dirname(sourceDir));
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") throw error;
    }
  }
}

async function main() {
  if (!dryRun) {
    await fs.mkdir(clientAssets, { recursive: true });
    for (const bucket of ["meshes", "textures", "audio", "other"]) {
      await fs.mkdir(path.join(assetDelivery, bucket), { recursive: true });
    }
  }

  try {
    const entries = await fs.readdir(oldContent);
    for (const name of entries) {
      if (name === "cache") continue;
      await moveEntry(path.join(oldContent, name), path.join(clientAssets, name));
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await moveLegacyCache();

  if (!dryRun) {
    try {
      await fs.rmdir(oldContent);
      log("remove empty legacy directory", oldContent);
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") throw error;
      if (error.code === "ENOTEMPTY") {
        console.warn(`Legacy data remains at ${oldContent}; inspect it before removing it.`);
      }
    }
  }
  console.log(`Asset migration ${dryRun ? "preview" : "complete"} for ${root}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
