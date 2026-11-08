import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

export type Json = Record<string, unknown>;
export const dataDir =
  process.env.SERVER_WEBVIEW_DATA_DIR || path.resolve(__dirname, "../web/data");
const dirs = {
  rep: path.join(dataDir, "replays"),
  snap: path.join(dataDir, "snapshots"),
};
export const replays = new Map<string, Json>();
export const snapshots = new Map<string, Json>();
export const thumbnails = path.join(dataDir, "thumbnails");

export async function loadData(): Promise<void> {
  for (const [kind, map] of [
    ["rep", replays],
    ["snap", snapshots],
  ] as const) {
    await fs.mkdir(dirs[kind], { recursive: true });
    for (const name of await fs.readdir(dirs[kind])) {
      if (!name.endsWith(".json")) continue;
      try {
        const row = JSON.parse(
          await fs.readFile(path.join(dirs[kind], name), "utf8"),
        ) as Json;
        const id = String(row[kind === "rep" ? "replayId" : "serverId"] || "");
        if (id) map.set(id, row);
      } catch {
        /* skip corrupt legacy file */
      }
    }
  }
  await fs.mkdir(thumbnails, { recursive: true });
}
export async function save(
  kind: "rep" | "snap",
  id: string,
  row: Json,
): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(row).filter(([key]) => !key.startsWith("__")),
  );
  const filename = `${kind}-${Buffer.from(id).toString("hex").slice(0, 128)}.json`;
  const target = path.join(dirs[kind], filename);
  const temp = target + `.${randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(temp, JSON.stringify(clean), "utf8");
  await fs.rename(temp, target);
  (kind === "rep" ? replays : snapshots).set(id, clean);
}
export async function removeSnapshot(id: string): Promise<boolean> {
  const removed = snapshots.delete(id);
  if (!removed) return false;
  for (const name of await fs.readdir(dirs.snap)) {
    if (!name.endsWith(".json")) continue;
    const file = path.join(dirs.snap, name);
    try {
      const row = JSON.parse(await fs.readFile(file, "utf8")) as Json;
      if (String(row.serverId || "") === id) await fs.unlink(file);
    } catch {
      /* leave unrelated or corrupt files */
    }
  }
  return true;
}
