const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseTime, formatTime, validRange } = require('../playback-utils.js');

test('accepts seconds, minutes, hours and fractional seconds', () => {
  for (const [input, expected] of [['90',90], ['1:30',90], ['1:02:03',3723], ['0:01.250',1.25]]) {
    assert.equal(parseTime(input), expected);
  }
});
test('rejects invalid or ambiguous time input', () => {
  for (const input of ['', '-1', '1:60', '1:2', 'Infinity', '1:00:00:00', 'abc']) {
    assert.ok(Number.isNaN(parseTime(input)), input);
  }
});
test('formats minute and hour boundaries', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(90.9), '1:30');
  assert.equal(formatTime(3601), '1:00:01');
});
test('loop must be ordered and contained in finite media', () => {
  assert.equal(validRange(0, 10, 10), true);
  for (const args of [[10,10,20], [11,10,20], [-1,10,20], [0,21,20], [0,10,Infinity], [NaN,10,20]]) {
    assert.equal(validRange(...args), false);
  }
});
