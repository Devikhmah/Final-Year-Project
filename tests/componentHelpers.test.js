import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Helper logic extracted from CategoryMixChart & UtilizationTable
function calculateCategoryMix(tasks, timeLogs) {
  const logSumByTask = {};
  timeLogs.forEach((log) => {
    logSumByTask[log.task_id] = (logSumByTask[log.task_id] || 0) + (log.minutes_logged || 0);
  });

  const categoryTotals = {};
  tasks.forEach((task) => {
    const cat = task.category || 'Uncategorized';
    const loggedMins = logSumByTask[task.id] || 0;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + loggedMins;
  });

  return Object.entries(categoryTotals).map(([name, minutes]) => ({
    name,
    minutes,
    hours: parseFloat((minutes / 60).toFixed(1)),
  }));
}

function calculateEmployeeUtilization(employees, timeLogs, standardWeeklyHours = 40) {
  const minsByEmployee = {};
  timeLogs.forEach((log) => {
    minsByEmployee[log.user_id] = (minsByEmployee[log.user_id] || 0) + (log.minutes_logged || 0);
  });

  return employees
    .filter((e) => e.role === 'employee')
    .map((emp) => {
      const loggedMins = minsByEmployee[emp.id] || 0;
      const loggedHours = parseFloat((loggedMins / 60).toFixed(1));
      const utilizationPct = Math.round((loggedHours / standardWeeklyHours) * 100);
      return {
        id: emp.id,
        name: emp.full_name,
        email: emp.email,
        loggedHours,
        utilizationPct,
        isOverloaded: utilizationPct > 100,
        isUnderutilized: utilizationPct < 50,
      };
    });
}

describe('Component Helper Utilities & Analytics Functions', () => {

  test('calculateCategoryMix sums time logs correctly by category', () => {
    const sampleTasks = [
      { id: 't1', category: 'Development' },
      { id: 't2', category: 'Development' },
      { id: 't3', category: 'Design' },
    ];
    const sampleLogs = [
      { task_id: 't1', minutes_logged: 120 },
      { task_id: 't2', minutes_logged: 60 },
      { task_id: 't3', minutes_logged: 90 },
    ];

    const mix = calculateCategoryMix(sampleTasks, sampleLogs);
    const dev = mix.find((m) => m.name === 'Development');
    const design = mix.find((m) => m.name === 'Design');

    assert.equal(dev.minutes, 180);
    assert.equal(dev.hours, 3.0);
    assert.equal(design.minutes, 90);
    assert.equal(design.hours, 1.5);
  });

  test('calculateEmployeeUtilization identifies overloaded and underutilized staff', () => {
    const sampleEmployees = [
      { id: 'e1', full_name: 'Alice Overworked', email: 'alice@sme.com', role: 'employee' },
      { id: 'e2', full_name: 'Bob Idle', email: 'bob@sme.com', role: 'employee' },
      { id: 'm1', full_name: 'Carol Manager', email: 'carol@sme.com', role: 'manager' },
    ];

    const sampleLogs = [
      { user_id: 'e1', minutes_logged: 3000 }, // 50 hours (125% utilization)
      { user_id: 'e2', minutes_logged: 600 },  // 10 hours (25% utilization)
    ];

    const utilization = calculateEmployeeUtilization(sampleEmployees, sampleLogs, 40);
    assert.equal(utilization.length, 2); // Excludes manager 'm1'

    const alice = utilization.find((u) => u.id === 'e1');
    const bob = utilization.find((u) => u.id === 'e2');

    assert.equal(alice.loggedHours, 50.0);
    assert.equal(alice.utilizationPct, 125);
    assert.equal(alice.isOverloaded, true);

    assert.equal(bob.loggedHours, 10.0);
    assert.equal(bob.utilizationPct, 25);
    assert.equal(bob.isUnderutilized, true);
  });

});
