import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Core calculation logic mirroring VelocityMetrics component calculations
function calculateVelocityMetrics(tasks, timeWindow = 'week', referenceDate = new Date()) {
  const cutoffDate = new Date(referenceDate);
  if (timeWindow === 'week') {
    cutoffDate.setDate(referenceDate.getDate() - 7);
  } else {
    cutoffDate.setDate(referenceDate.getDate() - 30);
  }

  const windowTasks = tasks.filter((t) => {
    const taskDate = new Date(t.created_at || referenceDate);
    return taskDate >= cutoffDate;
  });

  const assignedCount = windowTasks.length;
  const approvedCompletedTasks = windowTasks.filter((t) => t.status === 'done');
  const approvedCount = approvedCompletedTasks.length;
  const submittedBottleneckCount = windowTasks.filter((t) => t.status === 'submitted').length;

  let onTimeCount = 0;
  let overdueCount = 0;

  approvedCompletedTasks.forEach((task) => {
    if (!task.deadline) {
      onTimeCount++;
    } else {
      const deadlineDate = new Date(task.deadline);
      const completionDate = task.updated_at ? new Date(task.updated_at) : new Date(task.created_at || referenceDate);
      if (completionDate <= deadlineDate) {
        onTimeCount++;
      } else {
        overdueCount++;
      }
    }
  });

  return {
    assignedCount,
    approvedCount,
    submittedBottleneckCount,
    onTimeCount,
    overdueCount,
    approvalRate: assignedCount > 0 ? Math.round((approvedCount / assignedCount) * 100) : 0,
  };
}

describe('VelocityMetrics Logic & Aggregation Engine', () => {

  test('should return 0 for all metrics when task list is empty', () => {
    const result = calculateVelocityMetrics([]);
    assert.equal(result.assignedCount, 0);
    assert.equal(result.approvedCount, 0);
    assert.equal(result.submittedBottleneckCount, 0);
    assert.equal(result.onTimeCount, 0);
    assert.equal(result.overdueCount, 0);
    assert.equal(result.approvalRate, 0);
  });

  test('should correctly filter tasks within 7-day weekly window', () => {
    const refDate = new Date('2026-09-17T12:00:00Z');
    const sampleTasks = [
      { id: '1', status: 'done', created_at: '2026-09-15T10:00:00Z' }, // inside week
      { id: '2', status: 'submitted', created_at: '2026-09-12T10:00:00Z' }, // inside week
      { id: '3', status: 'done', created_at: '2026-09-01T10:00:00Z' }, // outside week (16 days old)
    ];

    const result = calculateVelocityMetrics(sampleTasks, 'week', refDate);
    assert.equal(result.assignedCount, 2);
    assert.equal(result.approvedCount, 1);
    assert.equal(result.submittedBottleneckCount, 1);
  });

  test('should include older tasks within 30-day monthly window', () => {
    const refDate = new Date('2026-09-17T12:00:00Z');
    const sampleTasks = [
      { id: '1', status: 'done', created_at: '2026-09-15T10:00:00Z' },
      { id: '2', status: 'submitted', created_at: '2026-09-12T10:00:00Z' },
      { id: '3', status: 'done', created_at: '2026-09-01T10:00:00Z' }, // inside month (16 days old)
      { id: '4', status: 'pending', created_at: '2026-07-01T10:00:00Z' }, // outside month (78 days old)
    ];

    const result = calculateVelocityMetrics(sampleTasks, 'month', refDate);
    assert.equal(result.assignedCount, 3);
    assert.equal(result.approvedCount, 2);
    assert.equal(result.submittedBottleneckCount, 1);
  });

  test('should accurately categorize on-time vs overdue completed tasks', () => {
    const refDate = new Date('2026-09-17T12:00:00Z');
    const sampleTasks = [
      {
        id: '1',
        status: 'done',
        created_at: '2026-09-15T10:00:00Z',
        updated_at: '2026-09-15T12:00:00Z',
        deadline: '2026-09-16T10:00:00Z', // Completed BEFORE deadline => On Time
      },
      {
        id: '2',
        status: 'done',
        created_at: '2026-09-15T10:00:00Z',
        updated_at: '2026-09-17T10:00:00Z',
        deadline: '2026-09-16T10:00:00Z', // Completed AFTER deadline => Overdue
      },
      {
        id: '3',
        status: 'done',
        created_at: '2026-09-15T10:00:00Z',
        deadline: null, // No deadline => On Time
      }
    ];

    const result = calculateVelocityMetrics(sampleTasks, 'week', refDate);
    assert.equal(result.approvedCount, 3);
    assert.equal(result.onTimeCount, 2);
    assert.equal(result.overdueCount, 1);
  });

  test('should calculate correct approval rate percentage', () => {
    const refDate = new Date('2026-09-17T12:00:00Z');
    const sampleTasks = [
      { id: '1', status: 'done', created_at: '2026-09-15T10:00:00Z' },
      { id: '2', status: 'submitted', created_at: '2026-09-15T10:00:00Z' },
      { id: '3', status: 'pending', created_at: '2026-09-15T10:00:00Z' },
      { id: '4', status: 'in_progress', created_at: '2026-09-15T10:00:00Z' },
    ];

    const result = calculateVelocityMetrics(sampleTasks, 'week', refDate);
    assert.equal(result.assignedCount, 4);
    assert.equal(result.approvedCount, 1);
    assert.equal(result.approvalRate, 25); // 1 / 4 = 25%
  });

});
