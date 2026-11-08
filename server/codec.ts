export function decodeLz4(encoded: string, expected: number): string {
  if (!Number.isInteger(expected) || expected < 0 || expected > 196608)
    throw Error("invalid decoded chunk size");
  const source = Buffer.from(encoded, "base64");
  if (
    !source.length ||
    source.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")
  )
    throw Error("invalid base64");
  for (const skip of [0, 4]) {
    if (skip && (source.length < 4 || source.readUInt32LE(0) !== expected))
      continue;
    try {
      const out: number[] = [];
      let i = skip;
      while (i < source.length) {
        const token = source[i++];
        let literal = token >> 4;
        if (literal === 15) {
          let n;
          do {
            n = source[i++];
            literal += n;
          } while (n === 255);
        }
        if (i + literal > source.length || out.length + literal > expected)
          throw Error("invalid literal");
        for (let n = 0; n < literal; n++) out.push(source[i++]);
        if (i === source.length) break;
        if (i + 2 > source.length) throw Error("truncated offset");
        const offset = source.readUInt16LE(i);
        i += 2;
        if (!offset || offset > out.length) throw Error("invalid offset");
        let count = (token & 15) + 4;
        if ((token & 15) === 15) {
          let n;
          do {
            n = source[i++];
            count += n;
          } while (n === 255);
        }
        if (out.length + count > expected) throw Error("output too large");
        for (let n = 0; n < count; n++) out.push(out[out.length - offset]);
      }
      if (out.length === expected) return Buffer.from(out).toString("utf8");
    } catch {
      /* try optional length prefix */
    }
  }
  throw Error("invalid lz4 block");
}

function indexedMeshToObj(
  body: Buffer,
  vertStart: number,
  stride: number,
  verts: number,
  faceStart: number,
  faces: number,
): Buffer {
  const lines: string[] = [];
  for (let i = 0; i < verts; i++) {
    const o = vertStart + i * stride;
    const v = Array.from({ length: 8 }, (_, n) => body.readFloatLE(o + n * 4));
    if (!v.every(Number.isFinite)) throw Error("invalid vertex");
    lines.push(
      `v ${v[0]} ${v[1]} ${v[2]}`,
      `vn ${v[3]} ${v[4]} ${v[5]}`,
      // Roblox mesh UVs use a top-left origin; OBJ/Three.js expects bottom-left.
      `vt ${v[6]} ${1 - v[7]}`,
    );
  }
  for (let i = 0; i < faces; i++) {
    const o = faceStart + i * 12;
    const f = [0, 4, 8].map((n) => body.readUInt32LE(o + n));
    if (f.some((n) => n >= verts)) throw Error("invalid face");
    lines.push("f " + f.map((n) => `${n + 1}/${n + 1}/${n + 1}`).join(" "));
  }
  return Buffer.from(lines.join("\n") + "\n");
}

function firstLodFaces(
  body: Buffer,
  start: number,
  lods: number,
  faces: number,
): number {
  if (lods < 2) return faces;
  const first = body.readUInt32LE(start);
  const second = body.readUInt32LE(start + 4);
  if (first !== 0 || second > faces) throw Error("invalid mesh lod");
  return second > 0 ? second : faces;
}

export function meshToObj(body: Buffer): Buffer {
  const nl = body.indexOf(10);
  if (nl < 0) throw Error("unsupported mesh format");
  const version = body.subarray(0, nl).toString().trim();
  if (version === "version 1.00" || version === "version 1.01") {
    const end = body.indexOf(10, nl + 1);
    if (end < 0) throw Error("truncated text mesh");
    const faces = Number(body.subarray(nl + 1, end).toString());
    if (!Number.isInteger(faces) || faces < 1 || faces > 500000)
      throw Error("invalid face count");
    const vectors = [
      ...body
        .subarray(end + 1)
        .toString()
        .matchAll(/\[([^\]]+)\]/g),
    ];
    if (vectors.length !== faces * 9) throw Error("truncated text mesh");
    const lines: string[] = [];
    for (let i = 0; i < vectors.length; i += 3) {
      const [pos, normal, uv] = vectors
        .slice(i, i + 3)
        .map((m) => m[1].split(",").map(Number));
      if (
        [pos, normal, uv].some(
          (v) => v.length !== 3 || !v.every(Number.isFinite),
        )
      )
        throw Error("invalid text mesh vector");
      const scale = version === "version 1.00" ? 0.5 : 1;
      lines.push(
        `v ${pos[0] * scale} ${pos[1] * scale} ${pos[2] * scale}`,
        `vn ${normal[0]} ${normal[1]} ${normal[2]}`,
        `vt ${uv[0]} ${1 - uv[1]}`,
      );
    }
    for (let i = 0; i < faces * 3; i += 3)
      lines.push(
        `f ${i + 1}/${i + 1}/${i + 1} ${i + 2}/${i + 2}/${i + 2} ${i + 3}/${i + 3}/${i + 3}`,
      );
    return Buffer.from(lines.join("\n") + "\n");
  }
  if (version === "version 3.00" || version === "version 3.01") {
    const start = nl + 1;
    if (start + 16 > body.length) throw Error("short mesh header");
    const header = body.readUInt16LE(start);
    const stride = body[start + 2];
    const faceStride = body[start + 3];
    const lodStride = body.readUInt16LE(start + 4);
    const lods = body.readUInt16LE(start + 6);
    const verts = body.readUInt32LE(start + 8);
    const faces = body.readUInt32LE(start + 12);
    if (
      header !== 16 ||
      ![36, 40].includes(stride) ||
      faceStride !== 12 ||
      lodStride !== 4 ||
      verts < 3 ||
      verts > 1e6 ||
      faces < 1 ||
      faces > 1e6 ||
      lods > 1024
    )
      throw Error("invalid mesh header");
    const vertStart = start + header;
    const faceStart = vertStart + verts * stride;
    const lodStart = faceStart + faces * 12;
    if (lodStart + lods * 4 > body.length) throw Error("short mesh");
    return indexedMeshToObj(
      body,
      vertStart,
      stride,
      verts,
      faceStart,
      firstLodFaces(body, lodStart, lods, faces),
    );
  }
  if (
    version === "version 4.00" ||
    version === "version 4.01" ||
    version === "version 5.00"
  ) {
    const start = nl + 1;
    const expectedHeader = version === "version 5.00" ? 32 : 24;
    if (start + expectedHeader > body.length) throw Error("short mesh header");
    const header = body.readUInt16LE(start);
    const verts = body.readUInt32LE(start + 4);
    const faces = body.readUInt32LE(start + 8);
    const lods = body.readUInt16LE(start + 12);
    const bones = body.readUInt16LE(start + 14);
    if (
      header !== expectedHeader ||
      verts < 3 ||
      verts > 1e6 ||
      faces < 1 ||
      faces > 1e6 ||
      lods > 1024
    )
      throw Error("invalid mesh header");
    // V4 stores 40-byte vertices, optional skin weights, faces and LOD offsets.
    const vertStart = start + header;
    const faceStart = vertStart + verts * 40 + (bones ? verts * 8 : 0);
    const lodStart = faceStart + faces * 12;
    if (lodStart + lods * 4 > body.length) throw Error("short mesh");
    return indexedMeshToObj(
      body,
      vertStart,
      40,
      verts,
      faceStart,
      firstLodFaces(body, lodStart, lods, faces),
    );
  }
  if (version !== "version 2.00") throw Error("unsupported mesh format");
  const start = nl + 1;
  if (start + 12 > body.length) throw Error("short mesh header");
  const header = body.readUInt16LE(start),
    stride = body[start + 2],
    faceStride = body[start + 3];
  const verts = body.readUInt32LE(start + 4),
    faces = body.readUInt32LE(start + 8);
  if (
    header < 12 ||
    ![36, 40].includes(stride) ||
    faceStride !== 12 ||
    verts > 1e6 ||
    faces > 1e6
  )
    throw Error("invalid mesh header");
  const vertStart = start + header,
    faceStart = vertStart + verts * stride;
  if (faceStart + faces * 12 > body.length) throw Error("short mesh");
  return indexedMeshToObj(body, vertStart, stride, verts, faceStart, faces);
}

export async function meshToObjAsync(body: Buffer): Promise<Buffer> {
  if (body.subarray(0, body.indexOf(10)).toString().trim() === "version 7.00") {
    const { dracoMeshToObj } = await import("./mesh-draco.js");
    return dracoMeshToObj(body);
  }
  return meshToObj(body);
}
