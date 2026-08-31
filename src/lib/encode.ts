// Carry the tape inside the URL so a link is self-contained: no store, no database.
// deflate-raw, then base64url. Standard APIs, so the browser and the server share this.

const toB64Url = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64Url = (str: string) => {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

const pipe = async (bytes: Uint8Array, t: CompressionStream | DecompressionStream) => {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(
    t as unknown as ReadableWritablePair<Uint8Array, Uint8Array>,
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

export async function encodeTape(src: string): Promise<string> {
  const out = await pipe(new TextEncoder().encode(src), new CompressionStream('deflate-raw'));
  return toB64Url(out);
}

/**
 * A ceiling on what a code is allowed to become, not just on the code.
 *
 * `MAX_CODE` bounds the compressed bytes and deflate undoes that, so a short
 * address can render an enormous SVG. The stream is therefore read a chunk at a
 * time and dropped the moment it passes this. The largest preset is near 1 KB,
 * so the room here is generous by any honest measure of what a demo is.
 *
 * @see docs/notes/measurements.md, "A short address can render an enormous SVG"
 */
export const MAX_TAPE = 16384;

/** Thrown by `decodeTape` alone, so the route can say which limit was hit. */
export class TapeTooLong extends Error {
  constructor() { super('tape too long'); }
}

export async function decodeTape(code: string): Promise<string> {
  const stream = new Blob([fromB64Url(code) as BlobPart]).stream().pipeThrough(
    new DecompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>,
  );

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_TAPE) throw new TapeTooLong();
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return new TextDecoder().decode(out);
}

export const MAX_CODE = 4000;   // URL ceiling; past this the editor offers a download instead.
