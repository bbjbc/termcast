// Carry the tape inside the URL so a link is self-contained — no store, no database.
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

export async function decodeTape(code: string): Promise<string> {
  const out = await pipe(fromB64Url(code), new DecompressionStream('deflate-raw'));
  return new TextDecoder().decode(out);
}

export const MAX_CODE = 4000;   // URL ceiling; past this the editor offers a download instead.
