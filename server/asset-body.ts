/** Read Asset Delivery responses without buffering beyond the configured cap. */
export async function readLimitedAssetBody(
  response: Response,
  maxBytes = 32 * 1024 * 1024,
): Promise<Buffer | null> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const pieces: Buffer[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      pieces.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(pieces, bytes);
}
