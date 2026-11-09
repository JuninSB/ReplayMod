import http, { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomBytes, randomInt, createHash } from "node:crypto";
import { decodeLz4, meshToObjAsync } from "./codec";
import { materialAliases } from "./materials";
import { expandCompactSnapshot } from "./compact";
import { readLimitedAssetBody } from "./asset-body";
import {
  decryptVault,
  initializeCredential,
  UnlockedVault,
} from "./asset-auth";
import {
  Json,
  loadData,
  replays,
  snapshots,
  save,
  removeSnapshot,
  thumbnails,
} from "./store";

const root = path.resolve(__dirname, "..");
const diagnosticLog =
  process.env.SERVER_WEBVIEW_LOG_PATH ||
  path.join(root, "replaymod-server.log");
function diagnostic(message: string): void {
  const line = `${new Date().toISOString()} ${message}\n`;
  void fs.appendFile(diagnosticLog, line).catch(() => {
    console.error("[Replay Mod] Could not write diagnostic log.");
  });
}
try {
  for (const line of readFileSync(path.join(root, "web/.env"), "utf8").split(
    /\r?\n/,
  )) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined)
      process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
} catch {
  /* optional local config */
}
const publicBase = (
  process.env.SERVER_WEBVIEW_PUBLIC_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
function isLoopbackBase(value: string): boolean {
  try {
    const hostname = new URL(value).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "");
    return (
      hostname === "localhost" ||
      hostname === "::1" ||
      /^127(?:\.\d{1,3}){3}$/.test(hostname)
    );
  } catch {
    return false;
  }
}
const host = process.env.SERVER_WEBVIEW_HOST || "127.0.0.1";
const port = Number(process.env.SERVER_WEBVIEW_PORT || 8000);
const maxBody = Number(
  process.env.SERVER_WEBVIEW_MAX_SNAPSHOT_BODY_BYTES || 100 * 1024 * 1024,
);
const uploads = new Map<
  string,
  {
    kind: "rep" | "snap";
    sid: string;
    total: number;
    chunks: Map<number, string>;
    bytes: number;
    created: number;
  }
>();
const tokens = new Map<string, { sid: string; expires: number; ip?: string }>();
const loginCodes = new Map<string, { expires: number; used: boolean }>();
const tickets = new Map<string, { sid: string; ip: string; expires: number }>();
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".obj": "model/obj",
  ".glb": "model/gltf-binary",
  ".dds": "image/vnd-ms.dds",
};
const legacyContentDir = path.resolve(
  process.env.SERVER_WEBVIEW_CONTENT_DIR || path.join(root, "content"),
);
const clientAssetsDir = path.resolve(
  process.env.SERVER_WEBVIEW_CLIENT_ASSETS_DIR ||
    process.env.SERVER_WEBVIEW_CONTENT_DIR ||
    path.join(root, "client-assets"),
);
const assetDeliveryDir = path.resolve(
  process.env.SERVER_WEBVIEW_ASSET_DELIVERY_DIR ||
    path.join(root, "assetdelivery"),
);
const legacyContentDirs = [
  ...new Set([path.resolve(root, "content"), legacyContentDir]),
];
const externalClientContentDir = process.env
  .SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR
  ? path.resolve(process.env.SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR)
  : "";
function clientContentRoots(): string[] {
  return [
    ...new Set([
      clientAssetsDir,
      ...legacyContentDirs,
      ...(externalClientContentDir ? [externalClientContentDir] : []),
    ]),
  ];
}
function assetCacheDirs(kind: "mesh" | "texture"): string[] {
  const bucket = kind === "mesh" ? "meshes" : "textures";
  return [
    path.join(assetDeliveryDir, bucket),
    ...legacyContentDirs.map((dir) => path.join(dir, "cache", "node")),
  ];
}
let credential: UnlockedVault | null = null;
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}
function obj(v: unknown): v is Json {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function json(res: ServerResponse, data: unknown, status = 200): void {
  const body = Buffer.from(JSON.stringify(data));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
  });
  res.end(body);
}
function fail(res: ServerResponse, message: string, status = 400): void {
  json(res, { error: message }, status);
}
function binary(
  res: ServerResponse,
  body: Buffer,
  type: string,
  cache = 180,
): void {
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": body.length,
    "Cache-Control": cache ? `public, max-age=${cache}` : "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}
function loopback(req: IncomingMessage): boolean {
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
    req.socket.remoteAddress || "",
  );
}
function authorized(req: IncomingMessage, body: Json): boolean {
  const token = str(req.headers["x-upload-token"]);
  const row = tokens.get(token);
  if (
    !row ||
    row.expires < Date.now() ||
    row.sid !== str(body.serverId) ||
    (row.ip && row.ip !== req.socket.remoteAddress)
  )
    return false;
  return true;
}
async function readJson(req: IncomingMessage): Promise<Json> {
  const pieces: Buffer[] = [];
  let bytes = 0;
  for await (const part of req) {
    const b = Buffer.from(part);
    bytes += b.length;
    if (bytes > maxBody) throw new Error("payload too large");
    pieces.push(b);
  }
  const value: unknown = JSON.parse(Buffer.concat(pieces).toString("utf8"));
  if (!obj(value)) throw new SyntaxError("invalid json payload");
  return value;
}
function safeId(id: string): string {
  return createHash("sha256").update(id).digest("hex").slice(0, 32);
}
function publicRow(row: Json): Json {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !key.startsWith("__")),
  );
}
function timestamp(row: Json): number {
  const t = Date.parse(str(row.timestamp));
  return Number.isFinite(t) ? t : 0;
}
function latest(map: Map<string, Json>): Json | undefined {
  return [...map.values()].sort((a, b) => timestamp(b) - timestamp(a))[0];
}
function validReplay(v: Json): string | null {
  const base = v.base,
    frames = v.frames;
  if (
    !str(v.serverId) ||
    !obj(base) ||
    !Array.isArray(base.parts) ||
    !Array.isArray(frames)
  )
    return "serverId, base.parts and frames are required";
  const duration = Number(v.durationMs ?? v.durMs ?? 0);
  if (
    !Number.isFinite(duration) ||
    duration < 0 ||
    duration > 86400000 ||
    frames.length > 1728000 ||
    base.parts.length > 100000
  )
    return "invalid replay size or duration";
  let previous = -1;
  for (const item of frames) {
    if (!obj(item)) return "invalid frame";
    const t = Number(item.t);
    if (
      !Number.isFinite(t) ||
      t < previous ||
      t > duration ||
      ["a", "u", "d", "da", "du", "dd"].some(
        (key) => item[key] !== undefined && !Array.isArray(item[key]),
      )
    )
      return "invalid frame";
    previous = t;
  }
  if (v.chatEvents !== undefined && !Array.isArray(v.chatEvents))
    return "invalid chat events";
  return null;
}
function expandFrameBlocks(v: Json): Json {
  if (Array.isArray(v.frames) || !Array.isArray(v.frameBlocks)) return v;
  if (v.frameBlocks.length > 100000) throw new Error("too many frame blocks");
  const frames: unknown[] = [];
  let decodedBytes = 0;
  for (const block of v.frameBlocks) {
    if (!obj(block) || typeof block.data !== "string")
      throw new Error("invalid frame block");
    let raw: string;
    if (block.codec === "lz4")
      raw = decodeLz4(block.data, Number(block.originalBytes));
    else if (block.codec === "json") raw = block.data;
    else throw new Error("unsupported frame codec");
    decodedBytes += Buffer.byteLength(raw);
    if (decodedBytes > maxBody * 10)
      throw new Error("decoded replay too large");
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows)) throw new Error("invalid frame block");
    for (const row of rows) frames.push(row);
    if (frames.length > 1728000) throw new Error("too many replay frames");
  }
  const { frameBlocks, ...metadata } = v;
  return { ...metadata, frames };
}
async function ingestReplay(v: Json, res: ServerResponse): Promise<void> {
  try {
    v = expandFrameBlocks(v);
  } catch {
    return fail(res, "invalid compressed capture");
  }
  const error = validReplay(v);
  if (error) return fail(res, error);
  const rid = str(v.replayId) || randomBytes(10).toString("hex");
  const name = (
    str(v.replayName) || `Replay ${new Date().toLocaleString("pt-BR")}`
  ).slice(0, 64);
  const duration = Number(v.durationMs ?? v.durMs ?? 0);
  const row: Json = {
    ...publicRow(v),
    replayId: rid,
    replayName: name,
    durationMs: duration,
    durMs: duration,
    timestamp: str(v.timestamp) || new Date().toISOString(),
  };
  if (Array.isArray(row.chatEvents))
    row.chatEvents = row.chatEvents
      .slice(0, 2000)
      .filter(obj)
      .map((c) => ({
        t: Math.max(0, Number(c.t) || 0),
        name: str(c.name).slice(0, 48),
        msg: str(c.msg).slice(0, 220),
        userId: Number(c.userId) || 0,
      }))
      .filter((c) => c.msg);
  await save("rep", rid, row);
  json(res, { ok: true, replayId: rid, replayName: name });
}
async function ingestSnapshot(v: Json, res: ServerResponse): Promise<void> {
  try {
    v = expandCompactSnapshot(v);
  } catch {
    return fail(res, "invalid compact snapshot");
  }
  const sid = str(v.serverId);
  if (!sid) return fail(res, "serverId is required");
  const previous = snapshots.get(sid) || {};
  const merged = v.__partial ? { ...previous, ...v } : v;
  const name = (
    str(merged.snapshotName) ||
    str(merged.serverName) ||
    `Snapshot ${new Date().toLocaleString("pt-BR")}`
  ).slice(0, 42);
  const row = {
    ...publicRow(merged),
    serverId: sid,
    snapshotName: name,
    serverName: str(merged.serverName) || name,
    timestamp: str(merged.timestamp) || new Date().toISOString(),
  };
  await save("snap", sid, row);
  json(res, { ok: true, serverId: sid, snapshotName: name });
}
async function chunk(
  req: IncomingMessage,
  res: ServerResponse,
  v: Json,
  kind: "rep" | "snap",
): Promise<void> {
  const uploadId = str(v.uploadId),
    sid = str(v.serverId),
    total = Number(v.totalChunks),
    index = Number(v.chunkIndex);
  if (
    !uploadId ||
    !sid ||
    !Number.isInteger(total) ||
    total < 1 ||
    total > 100000 ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= total
  )
    return fail(res, "invalid chunk metadata");
  let piece = v.chunkData;
  if (v.codec === "lz4" && kind === "rep") {
    try {
      piece = decodeLz4(str(piece), Number(v.originalBytes));
    } catch {
      return fail(res, "invalid compressed chunk");
    }
  } else if (v.codec) return fail(res, "unsupported chunk codec");
  if (typeof piece !== "string" || !piece.length)
    return fail(res, "chunkData is required");
  const now = Date.now();
  for (const [id, state] of uploads)
    if (now - state.created > 10 * 60 * 1000) uploads.delete(id);
  let state = uploads.get(uploadId);
  if (!state) {
    state = { kind, sid, total, chunks: new Map(), bytes: 0, created: now };
    uploads.set(uploadId, state);
  }
  if (state.kind !== kind || state.sid !== sid || state.total !== total)
    return fail(res, "chunk metadata mismatch", 409);
  const prior = state.chunks.get(index);
  if (prior !== undefined && prior !== piece)
    return fail(res, "chunk conflict", 409);
  if (prior === undefined) {
    state.bytes += Buffer.byteLength(piece);
    if (state.bytes > maxBody * 10) {
      uploads.delete(uploadId);
      return fail(res, "assembled payload too large", 413);
    }
    state.chunks.set(index, piece);
  }
  if (state.chunks.size < total)
    return json(res, {
      ok: true,
      partial: true,
      receivedChunks: state.chunks.size,
      totalChunks: total,
    });
  const orderedChunks: string[] = [];
  for (let i = 0; i < total; i++) orderedChunks.push(state.chunks.get(i)!);
  const assembled = orderedChunks.join("");
  uploads.delete(uploadId);
  let payload: unknown;
  try {
    payload = JSON.parse(assembled);
  } catch {
    return fail(res, "invalid assembled json payload");
  }
  if (!obj(payload) || str(payload.serverId) !== sid)
    return fail(res, "assembled serverId mismatch");
  if (kind === "rep") return ingestReplay(payload, res);
  return ingestSnapshot(payload, res);
}
function assetId(src: string): string | null {
  const m =
    src.match(/^(?:rbxassetid:\/\/)?(\d+)$/i) || src.match(/[?&]id=(\d+)/i);
  return m ? m[1] : null;
}
function allowedUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return null;
    const host = url.hostname.toLowerCase();
    return [
      "assetdelivery.roblox.com",
      "www.roblox.com",
      "roblox.com",
      "apis.roblox.com",
      "thumbnails.roblox.com",
    ].includes(host) || host.endsWith(".rbxcdn.com")
      ? url
      : null;
  } catch {
    return null;
  }
}
async function fetchAsset(
  raw: string,
): Promise<{ body: Buffer; type: string } | null> {
  let url = raw;
  for (let i = 0; i < 6; i++) {
    const parsed = allowedUrl(url);
    if (!parsed) return null;
    const headers: Record<string, string> = { "User-Agent": "ReplayMod/2.0" };
    if (parsed.hostname === "assetdelivery.roblox.com") {
      const cookie = credential ? decryptVault(credential) : null;
      if (cookie) headers.Cookie = `.ROBLOSECURITY=${cookie}`;
    }
    if (
      parsed.hostname === "apis.roblox.com" &&
      process.env.SERVER_WEBVIEW_ROBLOX_API_KEY
    ) {
      headers["x-api-key"] = process.env.SERVER_WEBVIEW_ROBLOX_API_KEY;
    }
    const response = await fetch(url, {
      redirect: "manual",
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return null;
      url = new URL(location, url).toString();
      continue;
    }
    if (!response.ok) return null;
    const type = (
      response.headers.get("content-type") || "application/octet-stream"
    ).split(";")[0];
    const body = await readLimitedAssetBody(response);
    if (!body?.length) return null;
    if (type === "application/json") {
      let payload: unknown;
      try {
        payload = JSON.parse(body.toString("utf8"));
      } catch {
        return null;
      }
      if (!obj(payload)) return null;
      const locations = Array.isArray(payload.locations)
        ? payload.locations
        : [];
      const location =
        str(payload.location) || str(locations.find(obj)?.location);
      if (location) {
        url = location;
        continue;
      }
    }
    return { body, type };
  }
  return null;
}
async function localAsset(src: string): Promise<string | null> {
  if (!src.startsWith("rbxasset://")) return null;
  const relative = src.slice("rbxasset://".length).replace(/\\/g, "/");
  for (const contentRoot of clientContentRoots()) {
    const resolved = path.resolve(contentRoot, relative);
    if (!resolved.startsWith(contentRoot + path.sep)) continue;
    try {
      const [realRoot, realPath] = await Promise.all([
        fs.realpath(contentRoot),
        fs.realpath(resolved),
      ]);
      if (realPath.startsWith(realRoot + path.sep)) return realPath;
    } catch {
      // Keep looking in the other configured content roots.
    }
  }
  return null;
}
async function asset(
  res: ServerResponse,
  src: string,
  kind: "mesh" | "texture",
): Promise<void> {
  if (!src) return fail(res, "src is required");
  const local = await localAsset(src);
  if (local) {
    try {
      let body: Buffer = await fs.readFile(local);
      if (kind === "mesh" && body.subarray(0, 8).toString() === "version ")
        body = await meshToObjAsync(body);
      return binary(
        res,
        body,
        kind === "mesh"
          ? "model/obj"
          : mime[path.extname(local).toLowerCase()] || "image/png",
        600,
      );
    } catch {
      return fail(res, "local asset unavailable", 404);
    }
  }
  const id = assetId(src);
  if (!id && !allowedUrl(src)) return fail(res, "invalid asset source");
  // Mesh cache entries contain converted OBJ data; bump this namespace when
  // UV conversion changes so older inverted conversions are not reused.
  const cacheVersion = kind === "mesh" ? "mesh-obj-uv-v2" : "asset-v1";
  const key = createHash("sha256")
    .update(`${cacheVersion}:${src}`)
    .digest("hex");
  const cacheDirs = assetCacheDirs(kind);
  for (const cacheDir of cacheDirs) {
    const file = path.join(cacheDir, key);
    try {
      const cached = await fs.readFile(file);
      const type = (await fs.readFile(file + ".type", "utf8")).trim();
      return binary(res, cached, type, 600);
    } catch {
      /* try the next cache location */
    }
  }
  const targets = allowedUrl(src)
    ? [src]
    : [
        ...(process.env.SERVER_WEBVIEW_ROBLOX_API_KEY
          ? [`https://apis.roblox.com/asset-delivery-api/v1/assetId/${id}`]
          : []),
        `https://assetdelivery.roblox.com/v2/assetId/${id}`,
        `https://assetdelivery.roblox.com/v1/asset/?id=${id}`,
        `https://www.roblox.com/asset/?id=${id}`,
      ];
  let unsupportedMesh = false;
  for (const target of targets) {
    let result: { body: Buffer; type: string } | null;
    try {
      result = await fetchAsset(target);
    } catch {
      continue;
    }
    if (!result) continue;
    let { body, type } = result;
    if (kind === "texture") {
      if (
        body
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
        type = "image/png";
      else if (body.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
        type = "image/jpeg";
      else if (body.subarray(0, 4).toString() === "DDS ")
        type = "image/vnd-ms.dds";
      else if (
        body.subarray(0, 4).toString() === "RIFF" &&
        body.subarray(8, 12).toString() === "WEBP"
      )
        type = "image/webp";
      if (!type.startsWith("image/")) continue;
    } else {
      if (type.startsWith("text/html") || type === "application/json") continue;
      if (body.subarray(0, 8).toString() === "version ") {
        try {
          body = await meshToObjAsync(body);
          type = "model/obj";
        } catch {
          unsupportedMesh = true;
          continue;
        }
      } else if (
        body.subarray(0, 2).toString() === "v " ||
        body.subarray(0, 2).toString() === "# "
      )
        type = "model/obj";
    }
    const cacheDir = cacheDirs[0];
    const file = path.join(cacheDir, key);
    await fs.mkdir(cacheDir, { recursive: true });
    await Promise.all([
      fs.writeFile(file, body),
      fs.writeFile(file + ".type", type),
    ]);
    return binary(res, body, type, 600);
  }
  return fail(
    res,
    unsupportedMesh ? "unsupported mesh format" : `${kind} unavailable`,
    unsupportedMesh ? 422 : 404,
  );
}
async function thumbnailPath(id: string, kind: string): Promise<string | null> {
  const slug = id.replace(/[^A-Za-z0-9_-]/g, "-");
  const candidates = [
    path.join(thumbnails, `${kind}-${safeId(id)}.jpg`),
    path.join(thumbnails, `${kind}-${slug}.jpg`),
    path.join(thumbnails, `${kind}_${slug}.jpg`),
  ];
  for (const file of candidates) {
    try {
      await fs.access(file);
      return file;
    } catch {
      /* next */
    }
  }
  return null;
}
async function serveStatic(
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  const relative = pathname.slice("/static/".length);
  const base = path.join(root, "web", "static");
  const target = path.resolve(base, relative);
  if (!target.startsWith(base + path.sep))
    return fail(res, "invalid path", 400);
  try {
    binary(
      res,
      await fs.readFile(target),
      mime[path.extname(target).toLowerCase()] || "application/octet-stream",
      3600,
    );
  } catch {
    fail(res, "not found", 404);
  }
}
async function handle(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url || "/", "http://localhost");
  const p = url.pathname,
    method = req.method || "GET";
  if (method === "GET" && p === "/health")
    return json(res, { status: "ok", runtime: "node" });
  if (method === "GET" && p === "/") {
    let html = await fs.readFile(
      path.join(root, "web/templates/index.html"),
      "utf8",
    );
    html = html.replace(
      /\{\{ url_for\('static', filename='([^']+)'\) \}\}\?v=\{\{ app_version \}\}/g,
      (_, file: string) => `/static/${file}?v=${Date.now()}`,
    );
    return binary(res, Buffer.from(html), "text/html; charset=utf-8", 0);
  }
  if (method === "GET" && p.startsWith("/static/")) return serveStatic(res, p);
  if (method === "GET" && p === "/recorder.lua") {
    const script =
      `local REPLAY_BASE_URL = ${JSON.stringify(publicBase)}\n` +
      (await fs.readFile(path.join(root, "roblox/serializers.luau"), "utf8")) +
      (await fs.readFile(path.join(root, "roblox/recorder.luau"), "utf8"));
    res.setHeader("Cache-Control", "no-store");
    return binary(res, Buffer.from(script), "text/plain; charset=utf-8", 0);
  }
  if (
    method === "GET" &&
    (p === "/api/asset/texture" || p === "/api/asset/mesh")
  )
    return asset(
      res,
      str(url.searchParams.get("src")),
      p.endsWith("mesh") ? "mesh" : "texture",
    );
  if (method === "GET" && p === "/api/material/map") {
    const material = str(url.searchParams.get("material"))
      .toLowerCase()
      .replace(/^enum\.material\./, "")
      .replace(/[^a-z0-9]/g, "");
    const map = str(url.searchParams.get("type")).toLowerCase();
    if (
      !material ||
      !["color", "normal", "metalness", "roughness"].includes(map)
    )
      return fail(res, "invalid material or map type");
    const aliases = [material, ...(materialAliases[material] || [])].map(
      (name) => name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );
    const tags =
      map === "color"
        ? ["color", "albedo", "diffuse", "basecolor"]
        : map === "metalness"
          ? ["metalness", "metallic"]
          : [map];
    for (const contentRoot of clientContentRoots()) {
      const dir = path.join(contentRoot, "material_textures");
      let names: string[] = [];
      try {
        names = await fs.readdir(dir);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      const found = names.find((name) => {
        const stem = path
          .parse(name)
          .name.toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const alias = aliases.find((value) => stem.startsWith(value));
        if (!alias) return false;
        const suffix = stem.slice(alias.length);
        return map === "color"
          ? !/(normal|rough|metal)/.test(suffix)
          : tags.some((tag) => suffix.includes(tag));
      });
      if (found)
        return binary(
          res,
          await fs.readFile(path.join(dir, found)),
          mime[path.extname(found).toLowerCase()] || "image/png",
          1800,
        );
    }
    return fail(res, "local client material map unavailable", 404);
  }
  if (method === "POST" && p === "/api/auth/local") {
    if (!loopback(req)) return fail(res, "localhost only", 403);
    const body = await readJson(req);
    const sid = str(body.serverId);
    if (!sid || sid.length > 128) return fail(res, "invalid serverId");
    const token = randomBytes(24).toString("hex");
    tokens.set(token, { sid, expires: Date.now() + 86400000 });
    return json(res, { uploadToken: token });
  }
  if (method === "POST" && p === "/api/auth/redeem") {
    const body = await readJson(req);
    const code = str(body.code),
      sid = str(body.serverId);
    if (!/^\d{20}$/.test(code) || !sid || sid.length > 128)
      return fail(res, "invalid code or serverId");
    const row = loginCodes.get(code);
    if (!row) return fail(res, "code not found", 404);
    if (row.used) return fail(res, "code already used", 409);
    if (row.expires < Date.now()) {
      loginCodes.delete(code);
      return fail(res, "code expired", 410);
    }
    row.used = true;
    const ticket = randomBytes(24).toString("hex");
    tickets.set(ticket, {
      sid,
      ip: req.socket.remoteAddress || "",
      expires: Date.now() + 90000,
    });
    return json(res, { ok: true, ticket, expiresInSeconds: 90 });
  }
  if (method === "POST" && p === "/api/auth/exchange") {
    const body = await readJson(req);
    const ticket = str(body.ticket),
      sid = str(body.serverId);
    const row = tickets.get(ticket);
    if (!row) return fail(res, "ticket not found", 404);
    if (row.expires < Date.now()) {
      tickets.delete(ticket);
      return fail(res, "ticket expired", 410);
    }
    if (row.sid !== sid || row.ip !== (req.socket.remoteAddress || ""))
      return fail(res, "ticket mismatch", 409);
    tickets.delete(ticket);
    const token = randomBytes(24).toString("hex");
    tokens.set(token, { sid, ip: row.ip, expires: Date.now() + 3600000 });
    return json(res, {
      ok: true,
      uploadToken: token,
      header: "X-Upload-Token",
      expiresInSeconds: 3600,
    });
  }
  if (method === "GET" && p === "/api/replay/local-chunk") {
    if (!loopback(req)) return fail(res, "localhost only", 403);
    if (req.headers["sec-fetch-site"] === "cross-site")
      return fail(res, "cross-site request blocked", 403);
    return chunk(req, res, Object.fromEntries(url.searchParams), "rep");
  }
  if (method === "GET" && p === "/api/snapshot/local-chunk") {
    if (!loopback(req)) return fail(res, "localhost only", 403);
    if (req.headers["sec-fetch-site"] === "cross-site")
      return fail(res, "cross-site request blocked", 403);
    return chunk(req, res, Object.fromEntries(url.searchParams), "snap");
  }
  if (method === "GET" && p === "/api/replays") {
    const rows = await Promise.all(
      [...replays.values()]
        .sort((a, b) => timestamp(b) - timestamp(a))
        .map(async (r) => ({
          replayId: r.replayId,
          serverId: r.serverId,
          placeId: r.placeId,
          replayName: r.replayName,
          timestamp: r.timestamp,
          durationMs: r.durationMs,
          captureFps: r.captureFps,
          stepMs: r.stepMs,
          tickChanges: r.tickChanges,
          chatCount: Array.isArray(r.chatEvents) ? r.chatEvents.length : 0,
          thumbnailUrl: (await thumbnailPath(str(r.replayId), "rep"))
            ? `/api/server/thumbnail?replayId=${encodeURIComponent(str(r.replayId))}`
            : null,
        })),
    );
    return json(res, { replays: rows });
  }
  if (
    method === "GET" &&
    (p === "/api/replay/latest" || p.startsWith("/api/replay/"))
  ) {
    let id = str(url.searchParams.get("replayId"));
    if (p !== "/api/replay/latest") {
      try {
        id = decodeURIComponent(p.slice("/api/replay/".length));
      } catch {
        return fail(res, "invalid replayId");
      }
    }
    const row = id ? replays.get(id) : latest(replays);
    return row ? json(res, publicRow(row)) : fail(res, "replay not found", 404);
  }
  if (method === "GET" && p === "/api/servers") {
    const rows = await Promise.all(
      [...snapshots.values()]
        .sort((a, b) => timestamp(b) - timestamp(a))
        .map(async (s) => ({
          serverId: s.serverId,
          timestamp: s.timestamp,
          placeId: s.placeId,
          serverName: s.serverName,
          snapshotName: s.snapshotName,
          thumbnailUrl: (await thumbnailPath(str(s.serverId), "snap"))
            ? `/api/server/thumbnail?serverId=${encodeURIComponent(str(s.serverId))}`
            : null,
        })),
    );
    return json(res, { servers: rows });
  }
  if (method === "GET" && p === "/api/snapshot/latest") {
    const id = str(url.searchParams.get("serverId"));
    const row = id ? snapshots.get(id) : latest(snapshots);
    return row
      ? json(res, publicRow(row))
      : fail(res, "snapshot not found", 404);
  }
  if (method === "GET" && p === "/api/server/thumbnail") {
    const id =
      str(url.searchParams.get("replayId")) ||
      str(url.searchParams.get("serverId"));
    if (!id) return fail(res, "item id required");
    const file = await thumbnailPath(
      id,
      url.searchParams.has("replayId") ? "rep" : "snap",
    );
    return file
      ? binary(res, await fs.readFile(file), "image/jpeg", 300)
      : fail(res, "thumbnail not found", 404);
  }
  if (method === "POST" && p === "/api/server/thumbnail") {
    const body = await readJson(req);
    const id = str(body.replayId) || str(body.serverId),
      match = str(body.imageData).match(
        /^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/,
      );
    if (!id || !match) return fail(res, "invalid thumbnail");
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length < 128 || bytes.length > 2 * 1024 * 1024)
      return fail(res, "invalid thumbnail size");
    const kind = body.replayId ? "rep" : "snap";
    if (await thumbnailPath(id, kind))
      return fail(res, "that item already has a thumbnail", 409);
    await fs.writeFile(
      path.join(thumbnails, `${kind}-${safeId(id)}.jpg`),
      bytes,
    );
    return json(res, { ok: true, saved: true });
  }
  if (
    method === "POST" &&
    (p === "/api/replay" ||
      p === "/api/replay/chunk" ||
      p === "/api/snapshot" ||
      p === "/api/snapshot/chunk" ||
      p === "/api/snapshot/abort" ||
      p === "/api/snapshot/cleanup")
  ) {
    const body = await readJson(req);
    if (!authorized(req, body)) return fail(res, "upload token required", 401);
    if (p === "/api/replay") return ingestReplay(body, res);
    if (p === "/api/replay/chunk") return chunk(req, res, body, "rep");
    if (p === "/api/snapshot") return ingestSnapshot(body, res);
    if (p === "/api/snapshot/chunk") return chunk(req, res, body, "snap");
    if (p === "/api/snapshot/abort") {
      let removed = 0;
      for (const [id, state] of uploads)
        if (
          state.kind === "snap" &&
          state.sid === str(body.serverId) &&
          (!body.uploadId || id === str(body.uploadId))
        ) {
          uploads.delete(id);
          removed++;
        }
      return json(res, { ok: true, removedUploads: removed });
    }
    const id = str(body.serverId);
    const removed = await removeSnapshot(id);
    if (removed) {
      const file = await thumbnailPath(id, "snap");
      if (file) await fs.unlink(file);
    }
    return json(res, { ok: true, removed, serverId: id });
  }
  return fail(res, "not found", 404);
}
export async function start(): Promise<http.Server> {
  credential = await initializeCredential(path.join(root, "auth.lzk8"));
  await loadData();
  const server = http.createServer((req, res) => {
    const route = (req.url || "").split("?", 1)[0];
    if (
      /^\/api\/(auth\/(local|redeem|exchange)|(replay|snapshot)\/(chunk|local-chunk))$/.test(
        route,
      )
    ) {
      const started = Date.now();
      diagnostic(`request ${req.method} ${route} started`);
      res.once("finish", () =>
        diagnostic(
          `request ${req.method} ${route} status=${res.statusCode} duration_ms=${Date.now() - started}`,
        ),
      );
      res.once("close", () => {
        if (!res.writableFinished)
          diagnostic(
            `request ${req.method} ${route} disconnected duration_ms=${Date.now() - started}`,
          );
      });
    }
    handle(req, res).catch((error) => {
      diagnostic("request failed");
      console.error("[Replay Mod]", error);
      if (!res.headersSent)
        fail(
          res,
          error instanceof SyntaxError
            ? "invalid json payload"
            : error.message === "payload too large"
              ? "payload too large"
              : "internal error",
          error instanceof SyntaxError
            ? 400
            : error.message === "payload too large"
              ? 413
              : 500,
        );
      else res.end();
    });
  });
  server.once("close", () => {
    credential?.key.fill(0);
    credential = null;
  });
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      resolve();
    });
  });
  console.log(`[Replay Mod] http://${host}:${port}`);
  diagnostic("server started");
  console.log(
    `[Replay Mod] Loadstring: loadstring(game:HttpGet("${publicBase}/recorder.lua"))()`,
  );
  if (!isLoopbackBase(publicBase)) {
    const code = Array.from({ length: 20 }, () => randomInt(0, 10)).join("");
    loginCodes.set(code, { expires: Date.now() + 30 * 60 * 1000, used: false });
    console.log(`[Replay Mod] LOGIN CODE: ${code} (expires in 1799s)`);
  }
  return server;
}
if (require.main === module)
  start().catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "EADDRINUSE")
      console.error(
        `[Replay Mod] Port ${port} is already in use on ${host}. If /health responds, use the existing server.`,
      );
    else console.error(error);
    process.exitCode = 1;
  });
