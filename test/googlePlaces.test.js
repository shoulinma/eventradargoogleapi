const test = require('node:test');
const assert = require('node:assert/strict');
const { formatType, validateSearchInput } = require('../src/googlePlaces');

test('converts five miles to the Places API radius', () => {
  const result = validateSearchInput(' 1600 Amphitheatre Parkway ', 5);

  assert.equal(result.address, '1600 Amphitheatre Parkway');
  assert.equal(result.radiusMiles, 5);
  assert.equal(result.radiusMeters, 8046.72);
});

test('rejects empty addresses', () => {
  assert.throws(
    () => validateSearchInput('   ', 5),
    (error) => error.status === 400 && error.message === 'Please enter an address.'
  );
});

test('rejects unsupported radiuses', () => {
  assert.throws(() => validateSearchInput('Chicago, IL', 32), /cannot exceed 31 miles/);
  assert.throws(() => validateSearchInput('Chicago, IL', 0), /positive number/);
});

test('formats Google place types for display', () => {
  assert.equal(formatType('accounting_firm'), 'Accounting Firm');
  assert.equal(formatType(undefined), 'Business');
});
