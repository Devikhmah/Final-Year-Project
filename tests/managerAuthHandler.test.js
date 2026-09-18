import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { handleVerifyManagerCode } from '../server/managerAuthHandler.js';

describe('managerAuthHandler - handleVerifyManagerCode', () => {

  test('should verify successfully with default SME2026SECRET code', () => {
    delete process.env.MANAGER_SIGNUP_CODE;
    const result = handleVerifyManagerCode({ code: 'SME2026SECRET' });
    assert.equal(result.success, true);
    assert.match(result.message, /verified successfully/);
  });

  test('should trim whitespace from input code', () => {
    delete process.env.MANAGER_SIGNUP_CODE;
    const result = handleVerifyManagerCode({ code: '  SME2026SECRET \n' });
    assert.equal(result.success, true);
  });

  test('should verify custom code set in environment variable', () => {
    process.env.MANAGER_SIGNUP_CODE = 'CORP_ADMIN_2026';
    const result = handleVerifyManagerCode({ code: 'CORP_ADMIN_2026' });
    assert.equal(result.success, true);
    delete process.env.MANAGER_SIGNUP_CODE;
  });

  test('should reject invalid manager codes', () => {
    const result = handleVerifyManagerCode({ code: 'INVALID_PASSCODE' });
    assert.equal(result.success, false);
    assert.match(result.error, /Invalid Manager Access Code/);
  });

  test('should reject missing, empty, or non-string codes', () => {
    assert.equal(handleVerifyManagerCode({}).success, false);
    assert.equal(handleVerifyManagerCode({ code: null }).success, false);
    assert.equal(handleVerifyManagerCode({ code: '' }).success, false);
    assert.equal(handleVerifyManagerCode({ code: 12345 }).success, false);
    assert.equal(handleVerifyManagerCode({ code: {} }).success, false);
  });

});
