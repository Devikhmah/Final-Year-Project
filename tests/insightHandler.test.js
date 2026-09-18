import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { handleGenerateInsight } from '../server/insightHandler.js';

describe('insightHandler - handleGenerateInsight', () => {

  test('should return error response when GEMINI_API_KEY is not set', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalViteKey = process.env.VITE_GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.VITE_GEMINI_API_KEY;

    const result = await handleGenerateInsight({
      timeWindow: 'This Week',
      metrics: { assignedCount: 10, approvedCount: 8, onTimeCount: 7, overdueCount: 1, submittedBottleneckCount: 2, totalHoursLogged: 45 },
      employeeSummaries: [{ name: 'Test User', loggedHours: 35 }]
    });

    assert.equal(result.success, false);
    assert.match(result.error, /GEMINI_API_KEY is not set/);

    if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
    if (originalViteKey !== undefined) process.env.VITE_GEMINI_API_KEY = originalViteKey;
  });

  test('should handle empty task metrics with TC-09 zero data response', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.VITE_GEMINI_API_KEY;

    const result = await handleGenerateInsight({});
    assert.equal(result.success, true);
    assert.equal(result.isZeroDataState, true);
    assert.match(result.insightText, /No task activity or logged hours/);
  });

});
