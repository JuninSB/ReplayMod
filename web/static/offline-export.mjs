// Single-file viewer: module sources and binary assets stay inside the HTML.
const assetUrl = (kind, src) =>
  `/api/asset/${kind}?src=${encodeURIComponent(src)}`;
const modulePath = (specifier, parent) =>
  specifier === "three"
    ? "/static/vendor/three/build/three.module.js"
    : specifier.startsWith("three/addons/")
      ? "/static/vendor/three/examples/jsm/" + specifier.slice(13)
      : new URL(specifier, "http://local" + parent).pathname;

export async function collectModules(entry, getText) {
  const modules = {},
    pending = [entry];
  while (pending.length) {
    const file = pending.pop();
    if (modules[file]) continue;
    const source = await getText(file);
    const dependencies =
      /((?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'])([^"']+)(["'])/g;
    modules[file] = source.replace(
      dependencies,
      (match, before, specifier, after) => {
        if (!specifier.startsWith(".") && !specifier.startsWith("three"))
          return match;
        const resolved = modulePath(specifier, file);
        pending.push(resolved);
        return before + "offline:" + resolved + after;
      },
    );
  }
  return modules;
}

export function captureAssets(capture) {
  const required = new Set(),
    materials = new Set();
  function visit(value, key = "") {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (value && typeof value === "object") {
      if (
        !value.meshId &&
        (String(value.meshType || "").endsWith(".Head") ||
          (value.name === "Head" &&
            value.className === "Part" &&
            value.meshScale &&
            !value.meshType))
      )
        required.add(assetUrl("mesh", "rbxasset://avatar/heads/head.mesh"));
      for (const [k, v] of Object.entries(value)) visit(v, k);
      return;
    }
    if ((key === "material" || key === "m") && typeof value === "string") materials.add(value);
    if (typeof value !== "string" || !value.trim()) return;
    if (
      /^(rbxasset(?:id)?:\/\/|https?:\/\/)/i.test(value.trim()) &&
      /meshId|texture|map|shirt|pants|graphic|skybox/i.test(key)
    ) {
      required.add(
        assetUrl(/meshId/i.test(key) ? "mesh" : "texture", value.trim()),
      );
    }
  }
  visit(capture);
  return { required, materials };
}

// The offline file has one capture, so it must not depend on rebuilding the
// normal server library before opening it. Keep the original capture intact
// while supplying the identity fields the viewer's selector expects.
export function offlineCaptureRow(offline) {
  const capture = offline?.capture && typeof offline.capture === "object"
    ? offline.capture
    : {};
  const mode = offline?.mode === "rep" ? "rep" : "snap";
  const id = String(
    offline?.id || (mode === "rep" ? capture.replayId : capture.serverId) || "",
  ).trim();
  return {
    ...capture,
    thumbnailUrl: null,
    ...(mode === "rep" ? { replayId: id } : { serverId: id }),
  };
}

// This function is serialized into the exported file. No server or CDN is used.
function startOffline() {
  const pack = JSON.parse(document.getElementById("offline-data").textContent);
  const assets = {};
  for (const [url, entry] of Object.entries(pack.assets)) {
    const bytes = Uint8Array.from(atob(entry.data), (c) => c.charCodeAt(0));
    assets[url] = URL.createObjectURL(new Blob([bytes], { type: entry.type }));
  }
  window.__REPLAY_OFFLINE__ = {
    assets,
    mode: pack.mode,
    id: pack.id,
    capture: pack.capture,
    failures: pack.failures,
  };
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, options) => {
    const raw = typeof input === "string" ? input : input.url;
    if (/^(blob:|data:)/.test(raw)) return originalFetch(input, options);
    const url = new URL(raw, "http://offline.local");
    const key = url.pathname + url.search;
    if (assets[key]) return originalFetch(assets[key]);
    let data;
    const row = { ...pack.capture, thumbnailUrl: null };
    if (url.pathname === "/api/replays")
      data = { replays: pack.mode === "rep" ? [row] : [] };
    else if (url.pathname === "/api/servers")
      data = { servers: pack.mode === "snap" ? [row] : [] };
    else if (
      url.pathname === "/api/replay/latest" ||
      url.pathname === "/api/snapshot/latest"
    )
      data = pack.capture;
    else
      return new Response(
        JSON.stringify({ error: "Unavailable in offline file" }),
        { status: 404 },
      );
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  };
  const imports = {};
  for (const [file, source] of Object.entries(pack.modules)) {
    imports["offline:" + file] = URL.createObjectURL(
      new Blob([source], { type: "text/javascript" }),
    );
  }
  const map = document.createElement("script");
  map.type = "importmap";
  map.textContent = JSON.stringify({ imports });
  document.head.appendChild(map);
  import("offline:/static/app.js").catch((error) => {
    document.getElementById("appStatus").textContent =
      "Could not open offline viewer: " + error.message;
  });
}

export async function readAssetWithRetry(url, request) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await request(url, attempt);
      if (!response.ok) throw new Error("HTTP " + response.status);
      const bytes = new Uint8Array(await response.arrayBuffer());
      return {
        bytes,
        type:
          response.headers.get("content-type") || "application/octet-stream",
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function downloadOffline({ mode, id, progress, confirmMissing }) {
  const request = (url, attempt = 1) =>
    fetch(url, {
      signal: AbortSignal.timeout(30000),
      cache: attempt > 1 ? "reload" : "default",
    });
  const read = async (url) => {
    const response = await request(url);
    if (!response.ok)
      throw new Error(
        `Could not include ${url.split("?")[0]} (HTTP ${response.status})`,
      );
    return response;
  };
  progress("Preparing offline viewer…");
  const endpoint =
    mode === "rep"
      ? "/api/replay/latest?replayId="
      : "/api/snapshot/latest?serverId=";
  const capture = await (await read(endpoint + encodeURIComponent(id))).json();
  const modules = await collectModules("/static/app.js", async (path) =>
    (await read(path)).text(),
  );
  const { required, materials } = captureAssets(capture);
  const optional = new Set();
  // Built-in fallbacks are also needed when no explicit texture was recorded.
  for (const match of modules["/static/app.js"].matchAll(
    /rbxasset:\/\/[^"'`\s)]+/g,
  ))
    optional.add(assetUrl("texture", match[0]));
  for (const material of materials)
    for (const type of ["color", "normal", "metalness", "roughness"]) {
      const normalized = material
        .replace("Enum.Material.", "")
        .replace("Enum.MaterialVariant.", "")
        .replace(/\s+/g, "")
        .trim();
      optional.add(
        `/api/material/map?material=${encodeURIComponent(normalized)}&type=${type}`,
      );
    }
  const urls = [...new Set([...required, ...optional])];
  const assets = {};
  let done = 0,
    next = 0;
  const failures = [];
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        const { bytes, type } = await readAssetWithRetry(url, request);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 32768)
          binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        assets[url] = { type, data: btoa(binary) };
      } catch {
        if (required.has(url) || url.startsWith("/api/asset/"))
          failures.push(url);
      }
      progress(`Packing assets ${++done}/${urls.length}…`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  if (failures.length && !(await confirmMissing(failures))) {
    progress("Export cancelled.");
    return;
  }
  const page = new DOMParser().parseFromString(
    await (await read("/")).text(),
    "text/html",
  );
  page.querySelectorAll("script").forEach((script) => script.remove());
  for (const link of page.querySelectorAll('link[rel="stylesheet"]')) {
    const style = page.createElement("style");
    style.textContent = await (await read(link.getAttribute("href"))).text();
    link.replaceWith(style);
  }
  const payload = page.createElement("script");
  payload.id = "offline-data";
  payload.type = "application/json";
  payload.textContent = JSON.stringify({
    mode,
    id,
    capture,
    modules,
    assets,
    failures,
  }).replace(/</g, "\\u003c");
  page.body.appendChild(payload);
  const boot = page.createElement("script");
  boot.textContent = "(" + startOffline.toString() + ")();";
  page.body.appendChild(boot);
  const html = "<!doctype html>\n" + page.documentElement.outerHTML;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    String(capture.replayName || capture.snapshotName || "ReplayMod").replace(
      /[^\w.-]+/g,
      "_",
    ) + "-offline.html";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  progress("Offline HTML downloaded.");
}
