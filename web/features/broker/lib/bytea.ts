// PostgREST encodes `bytea` as `\x`-prefixed hex on the wire. These helpers
// own that encoding so the hex parse logic lives in one place instead of
// being duplicated across every route that reads or writes a bytea column.

export function toBytea(buf: Buffer): string {
  return '\\x' + buf.toString('hex');
}

export function fromBytea(value: string | Buffer): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value !== 'string' || !value.startsWith('\\x')) {
    throw new Error('unexpected bytea payload shape');
  }
  const hex = value.slice(2);
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error('malformed bytea hex');
  }
  return Buffer.from(hex, 'hex');
}
