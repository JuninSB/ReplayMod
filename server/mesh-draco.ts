const draco3d = require("draco3d");

let decoderModule: Promise<any> | undefined;

function firstLodFaceCount(payload: Buffer | undefined, faces: number): number {
  if (!payload) return faces;
  for (let offset = 0; offset + 12 <= payload.length; offset++) {
    const count = payload.readUInt32LE(offset);
    if (count < 2 || count > 64 || offset + 4 + count * 4 > payload.length)
      continue;
    const first = payload.readUInt32LE(offset + 4);
    const second = payload.readUInt32LE(offset + 8);
    const last = payload.readUInt32LE(offset + count * 4);
    if (first !== 0 || second === 0 || second > faces || last !== faces)
      continue;
    let ordered = true;
    let previous = first;
    for (let i = 1; i < count; i++) {
      const current = payload.readUInt32LE(offset + 4 + i * 4);
      if (current < previous || current > faces) ordered = false;
      previous = current;
    }
    if (ordered) return second;
  }
  return faces;
}

function chunks(body: Buffer): { core: Buffer; lods?: Buffer } {
  const nl = body.indexOf(10);
  if (nl < 0 || body.subarray(0, nl).toString().trim() !== "version 7.00")
    throw Error("unsupported mesh format");
  let core: Buffer | undefined;
  let lods: Buffer | undefined;
  let offset = nl + 1;
  while (offset + 16 <= body.length) {
    const tag = body
      .subarray(offset, offset + 8)
      .toString()
      .replace(/\0+$/, "");
    const version = body.readUInt32LE(offset + 8);
    const size = body.readUInt32LE(offset + 12);
    offset += 16;
    if (offset + size > body.length) throw Error("short mesh chunk");
    const payload = body.subarray(offset, offset + size);
    if (tag === "COREMESH" && version === 2) core = payload;
    if (tag === "LODS") lods = payload;
    offset += size;
  }
  if (!core || core.length < 9) throw Error("missing mesh geometry");
  const length = core.readUInt32LE(0);
  if (length < 5 || length > core.length - 4)
    throw Error("invalid draco length");
  const blob = core.subarray(4, 4 + length);
  if (blob.subarray(0, 5).toString() !== "DRACO")
    throw Error("invalid draco mesh");
  return { core: blob, lods };
}

export async function dracoMeshToObj(body: Buffer): Promise<Buffer> {
  const { core, lods } = chunks(body);
  decoderModule ||= draco3d.createDecoderModule({});
  const draco = await decoderModule;
  const encoded = new draco.DecoderBuffer();
  const decoder = new draco.Decoder();
  const mesh = new draco.Mesh();
  let status: any;
  try {
    encoded.Init(new Int8Array(core), core.length);
    if (decoder.GetEncodedGeometryType(encoded) !== draco.TRIANGULAR_MESH)
      throw Error("draco asset is not a mesh");
    status = decoder.DecodeBufferToMesh(encoded, mesh);
    if (!status.ok()) throw Error("draco decode failed");
    const verts = mesh.num_points();
    const faces = mesh.num_faces();
    if (verts < 3 || verts > 1e6 || faces < 1 || faces > 1e6)
      throw Error("invalid draco mesh size");

    function attribute(id: number, components: number): Float32Array | null {
      const attr = decoder.GetAttributeByUniqueId(mesh, id);
      if (!attr || attr.num_components() !== components) return null;
      const length = verts * components;
      const bytes = length * 4;
      const ptr = draco._malloc(bytes);
      if (!ptr) throw Error("draco allocation failed");
      try {
        if (
          !decoder.GetAttributeDataArrayForAllPoints(
            mesh,
            attr,
            draco.DT_FLOAT32,
            bytes,
            ptr,
          )
        )
          throw Error("invalid draco attribute");
        return new Float32Array(draco.HEAPF32.buffer, ptr, length).slice();
      } finally {
        draco._free(ptr);
      }
    }

    const position = attribute(0, 3);
    const normal = attribute(1, 3);
    const uv = attribute(2, 2);
    if (!position) throw Error("missing draco positions");
    const indexCount = faces * 3;
    const indexBytes = indexCount * 4;
    const indexPtr = draco._malloc(indexBytes);
    if (!indexPtr) throw Error("draco allocation failed");
    let indices: Uint32Array;
    try {
      if (!decoder.GetTrianglesUInt32Array(mesh, indexBytes, indexPtr))
        throw Error("invalid draco indices");
      indices = new Uint32Array(
        draco.HEAPU32.buffer,
        indexPtr,
        indexCount,
      ).slice();
    } finally {
      draco._free(indexPtr);
    }

    const lines: string[] = [];
    for (let i = 0; i < verts; i++) {
      const p = i * 3;
      const t = i * 2;
      const values = [
        position[p],
        position[p + 1],
        position[p + 2],
        normal?.[p] ?? 0,
        normal?.[p + 1] ?? 1,
        normal?.[p + 2] ?? 0,
        uv?.[t] ?? 0,
        uv?.[t + 1] ?? 0,
      ];
      if (!values.every(Number.isFinite)) throw Error("invalid draco vertex");
      lines.push(
        `v ${values[0]} ${values[1]} ${values[2]}`,
        `vn ${values[3]} ${values[4]} ${values[5]}`,
        // Match Roblox's top-left UV origin to OBJ's bottom-left convention.
        `vt ${values[6]} ${1 - values[7]}`,
      );
    }
    const visibleFaces = firstLodFaceCount(lods, faces);
    for (let i = 0; i < visibleFaces; i++) {
      const face = [indices[i * 3], indices[i * 3 + 1], indices[i * 3 + 2]];
      if (face.some((index) => index >= verts))
        throw Error("invalid draco face");
      lines.push(
        "f " +
          face
            .map((index) => `${index + 1}/${index + 1}/${index + 1}`)
            .join(" "),
      );
    }
    return Buffer.from(lines.join("\n") + "\n");
  } finally {
    if (status) draco.destroy(status);
    draco.destroy(mesh);
    draco.destroy(decoder);
    draco.destroy(encoded);
  }
}
