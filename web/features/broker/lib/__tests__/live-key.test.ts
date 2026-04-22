import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertPaperKey,
  looksLikePaperKey,
  LiveKeyRejectedError,
} from '../live-key';

test('live-key: paper-prefixed keys pass', () => {
  assert.doesNotThrow(() => assertPaperKey('PKABCDEFGHIJKLMN'));
  assert.equal(looksLikePaperKey('PKABCDEFGHIJKLMN'), true);
});

test('live-key: live-trading prefix AK is rejected', () => {
  assert.throws(() => assertPaperKey('AKLIVEKEYLOOKSBAD'), LiveKeyRejectedError);
  assert.equal(looksLikePaperKey('AKLIVEKEYLOOKSBAD'), false);
});

test('live-key: lowercase or random prefix is rejected', () => {
  assert.throws(() => assertPaperKey('pkabcdef'), LiveKeyRejectedError);
  assert.throws(() => assertPaperKey('XXWHATEVER'), LiveKeyRejectedError);
});
