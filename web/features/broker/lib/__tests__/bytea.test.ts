import { test } from 'node:test';
import assert from 'node:assert/strict';

import { toBytea, fromBytea } from '../bytea';

test('bytea: round-trip', () => {
  const buf = Buffer.from([0x00, 0x7f, 0xff, 0xaa, 0x01]);
  const wire = toBytea(buf);
  assert.equal(wire, '\\x007fffaa01');
  assert.ok(fromBytea(wire).equals(buf));
});

test('bytea: passthrough for Buffer input', () => {
  const buf = Buffer.from([1, 2, 3]);
  assert.ok(fromBytea(buf).equals(buf));
});

test('bytea: missing \\x prefix is rejected', () => {
  assert.throws(() => fromBytea('deadbeef'), /unexpected bytea payload shape/);
});

test('bytea: odd-length hex is rejected', () => {
  assert.throws(() => fromBytea('\\xabc'), /malformed bytea hex/);
});

test('bytea: non-hex character is rejected', () => {
  assert.throws(() => fromBytea('\\x00zz00'), /malformed bytea hex/);
});

test('bytea: non-string / non-Buffer is rejected', () => {
  assert.throws(() => fromBytea(42 as unknown as string), /unexpected bytea payload shape/);
  assert.throws(() => fromBytea(null as unknown as string), /unexpected bytea payload shape/);
});
