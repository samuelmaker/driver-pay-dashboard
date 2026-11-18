const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('adjustments reject prototype keys and persist normal driver adjustments', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adjustments-test-'));
  const priorFile = process.env.ADJUSTMENTS_FILE;
  const priorJson = process.env.ADJUSTMENTS_JSON;
  process.env.ADJUSTMENTS_FILE = path.join(dir, 'adjustments.json');
  delete process.env.ADJUSTMENTS_JSON;
  const api = require('../lib/adjustments');
  try {
    for (const username of ['__proto__', 'constructor', 'prototype', {}, '']) {
      assert.throws(() => api.setAdjustment(username, '2026-11-18', 2));
      if (api.setFlag) assert.throws(() => api.setFlag(username, '2026-11-18', true));
      if (api.setTimeAdjustment) assert.throws(() => api.setTimeAdjustment(username, '2026-11-18', 0, 3600));
    }
    assert.equal(Object.hasOwn(Object.prototype, '2026-11-18'), false);
    assert.equal(api.setAdjustment('driver-one', '2026-11-18', 2, 'extra route'), true);
    assert.equal(api.getAdjustment('driver-one', '2026-11-18').hours, 2);
    assert.equal(JSON.parse(fs.readFileSync(process.env.ADJUSTMENTS_FILE))['driver-one']['2026-11-18'].hours, 2);
  } finally {
    if (priorFile === undefined) delete process.env.ADJUSTMENTS_FILE; else process.env.ADJUSTMENTS_FILE = priorFile;
    if (priorJson === undefined) delete process.env.ADJUSTMENTS_JSON; else process.env.ADJUSTMENTS_JSON = priorJson;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
