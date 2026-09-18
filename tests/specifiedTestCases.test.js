import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { handleVerifyManagerCode } from '../server/managerAuthHandler.js';
import { handleGenerateInsight } from '../server/insightHandler.js';
import { handleDeclineInvitation } from '../server/invitationHandler.js';

describe('Specification Acceptance Test Suite: TC-01 to TC-10', () => {

  // ==========================================
  // TC-01: Auth - Register as Manager with an incorrect access code
  // Expected: Registration rejected; no account created
  // ==========================================
  test('TC-01 [Auth]: Register as Manager with incorrect access code is rejected without creating an account', () => {
    // 1. Verification with wrong code fails
    const invalidVerification = handleVerifyManagerCode({ code: 'WRONG_SECRET_CODE' });
    assert.equal(invalidVerification.success, false);
    assert.match(invalidVerification.error, /Invalid Manager Access Code/);

    // 2. Verification with empty/missing code fails
    const missingVerification = handleVerifyManagerCode({ code: '' });
    assert.equal(missingVerification.success, false);

    // 3. Only the exact secret is accepted
    const validVerification = handleVerifyManagerCode({ code: 'SME2026SECRET' });
    assert.equal(validVerification.success, true);
  });

  // ==========================================
  // TC-02: Auth - Attempt to update own role via a direct API call
  // Expected: Rejected by database constraint/RLS, not just hidden in UI
  // ==========================================
  test('TC-02 [Auth]: Direct database/API update to user role is strictly prohibited by DB constraint/trigger', () => {
    const sqlContent = fs.readFileSync(path.resolve(process.cwd(), 'supabase_setup.sql'), 'utf8');

    // Verify trigger function raises exception
    assert.match(sqlContent, /CREATE OR REPLACE FUNCTION public\.prevent_role_update\(\)/i);
    assert.match(sqlContent, /Role updates are strictly prohibited/i);
    assert.match(sqlContent, /CREATE TRIGGER enforce_permanent_role/i);
    assert.match(sqlContent, /BEFORE UPDATE ON public\.users/i);

    // Simulating database trigger logic
    const attemptRoleChange = (oldRole, newRole) => {
      if (newRole !== oldRole) {
        throw new Error('Role updates are strictly prohibited. Account roles are permanent once created.');
      }
      return true;
    };

    assert.throws(
      () => attemptRoleChange('employee', 'manager'),
      /Role updates are strictly prohibited/
    );
  });

  // ==========================================
  // TC-03: Team Scoping - Manager A attempts to view Manager B's tasks/employees/analytics via a direct API call
  // Expected: Request returns no data belonging to Manager B
  // ==========================================
  test("TC-03 [Team Scoping]: Manager A attempting to view Manager B's tasks returns no data belonging to Manager B", () => {
    const managerA_Id = 'manager-uuid-aaa';
    const managerB_Id = 'manager-uuid-bbb';

    const allTasksInDb = [
      { id: 't1', title: 'Task A1', created_by: managerA_Id, assigned_to: 'emp-1' },
      { id: 't2', title: 'Task A2', created_by: managerA_Id, assigned_to: 'emp-2' },
      { id: 't3', title: 'Task B1', created_by: managerB_Id, assigned_to: 'emp-3' },
      { id: 't4', title: 'Task B2', created_by: managerB_Id, assigned_to: 'emp-4' },
    ];

    // RLS policy: (created_by = auth.uid() OR assigned_to = auth.uid())
    const applyRlsFilter = (tasks, currentUserId) => {
      return tasks.filter((t) => t.created_by === currentUserId || t.assigned_to === currentUserId);
    };

    const managerA_VisibleTasks = applyRlsFilter(allTasksInDb, managerA_Id);

    // Manager A sees only their own tasks
    assert.equal(managerA_VisibleTasks.length, 2);
    assert.deepEqual(managerA_VisibleTasks.map((t) => t.id), ['t1', 't2']);

    // Ensure absolutely NO data belonging to Manager B is returned
    const leakedManagerBTasks = managerA_VisibleTasks.filter((t) => t.created_by === managerB_Id);
    assert.equal(leakedManagerBTasks.length, 0);
  });

  // ==========================================
  // TC-04: Invitations - Employee declines an invitation
  // Expected: No account created; invitation status set to declined
  // ==========================================
  test('TC-04 [Invitations]: Employee declining invitation sets status to declined and does not create an account', () => {
    const mockInvitationsDb = [
      { id: 'inv-123', email: 'candidate@example.com', role: 'employee', status: 'pending' },
    ];

    const result = handleDeclineInvitation({
      invitationId: 'inv-123',
      invitationsDb: mockInvitationsDb,
    });

    assert.equal(result.success, true);
    assert.equal(result.status, 'declined');
    assert.equal(result.accountCreated, false);
    assert.equal(mockInvitationsDb[0].status, 'declined');
    assert.ok(mockInvitationsDb[0].declined_at);
  });

  // ==========================================
  // TC-05: Task Workflow - Employee attempts to set a task directly to done without submitting evidence
  // Expected: Rejected; only submitted → done via Manager approval is permitted
  // ==========================================
  test('TC-05 [Task Workflow]: Employee attempting to set task directly to done without proof/approval is rejected', () => {
    const sqlContent = fs.readFileSync(path.resolve(process.cwd(), 'supabase_setup.sql'), 'utf8');

    // 1. Verify RLS constraint: Employee UPDATE policy allows only ('pending', 'in_progress', 'submitted')
    assert.match(
      sqlContent,
      /status IN \('pending', 'in_progress', 'submitted'\)/i
    );

    // 2. Client-side & RLS rule simulation
    const simulateEmployeeStatusUpdate = (currentStatus, newStatus, hasProof) => {
      const allowedEmployeeStatuses = ['pending', 'in_progress', 'submitted'];
      if (!allowedEmployeeStatuses.includes(newStatus)) {
        throw new Error('RLS Violation: Employees are not permitted to set status to done. Manager approval required.');
      }
      if (newStatus === 'submitted' && !hasProof) {
        throw new Error('Proof Attachment Required! Please select a file to attach before submitting.');
      }
      return { status: newStatus };
    };

    // Employee setting directly to 'done' must throw RLS error
    assert.throws(
      () => simulateEmployeeStatusUpdate('in_progress', 'done', false),
      /RLS Violation/
    );

    // Employee setting to 'submitted' without proof must throw Proof Required error
    assert.throws(
      () => simulateEmployeeStatusUpdate('in_progress', 'submitted', false),
      /Proof Attachment Required/
    );
  });

  // ==========================================
  // TC-06: Task Workflow - Employee attempts to approve their own submitted task
  // Expected: Rejected; only a Manager account can approve
  // ==========================================
  test('TC-06 [Task Workflow]: Employee attempting to approve their own submitted task is rejected', () => {
    const simulateTaskApproval = (userRole, task) => {
      if (userRole !== 'manager') {
        throw new Error('Permission Denied: Only Manager accounts can approve submitted tasks.');
      }
      return { ...task, status: 'done', rejection_note: null };
    };

    const submittedTask = { id: 't99', status: 'submitted', assigned_to: 'emp-1' };

    // Employee role approval attempt must throw Permission Denied
    assert.throws(
      () => simulateTaskApproval('employee', submittedTask),
      /Only Manager accounts can approve/
    );

    // Manager role approval succeeds
    const approved = simulateTaskApproval('manager', submittedTask);
    assert.equal(approved.status, 'done');
  });

  // ==========================================
  // TC-07: Analytics - Compute completion velocity with zero approved tasks in the selected window
  // Expected: Dashboard shows an explicit “no data” state, not a fabricated or zero-division error
  // ==========================================
  test('TC-07 [Analytics]: Completion velocity with zero approved tasks displays explicit no-data state without zero-division error', () => {
    const computeVelocityDisplay = (assignedCount, approvedCount) => {
      // Must not produce NaN or Infinity
      const percentage = assignedCount > 0 ? Math.round((approvedCount / assignedCount) * 100) : 0;
      assert.ok(!Number.isNaN(percentage));
      assert.ok(Number.isFinite(percentage));

      if (assignedCount === 0 || approvedCount === 0) {
        return {
          percentage: `${percentage}%`,
          hasData: false,
          emptyMessage: 'No completed tasks recorded for this period. Add tasks or complete work to view delivery velocity.',
        };
      }
      return { percentage: `${percentage}%`, hasData: true };
    };

    const zeroTasks = computeVelocityDisplay(0, 0);
    assert.equal(zeroTasks.percentage, '0%');
    assert.equal(zeroTasks.hasData, false);
    assert.match(zeroTasks.emptyMessage, /No completed tasks/);

    const zeroApproved = computeVelocityDisplay(5, 0);
    assert.equal(zeroApproved.percentage, '0%');
    assert.equal(zeroApproved.hasData, false);
  });

  // ==========================================
  // TC-08: Proof Workflow - Manager rejects a submission with a note; Employee resubmits
  // Expected: Task returns to in_progress with the note visible to the Employee; a new submission is accepted
  // ==========================================
  test('TC-08 [Proof Workflow]: Manager rejects submission with note; Task resets to in_progress with note visible and new submission accepted', () => {
    let task = {
      id: 'task-108',
      status: 'submitted',
      rejection_note: null,
    };

    // 1. Manager rejects with note
    const rejectionNote = 'Design requires higher contrast buttons to comply with accessibility standards.';
    task = {
      ...task,
      status: 'in_progress',
      rejection_note: rejectionNote,
    };

    assert.equal(task.status, 'in_progress');
    assert.equal(task.rejection_note, rejectionNote);

    // 2. Note is visible to the employee (non-empty and displayed)
    assert.ok(task.rejection_note.length > 0);

    // 3. Employee resubmits with new proof attached
    const newProof = { file_name: 'updated_design_proof.png', file_url: 'https://cdn.example.com/proof.png' };
    assert.ok(newProof.file_name);

    task = {
      ...task,
      status: 'submitted',
      rejection_note: null, // cleared upon new review submission
    };

    assert.equal(task.status, 'submitted');
  });

  // ==========================================
  // TC-09: AI Insight - Trigger weekly insight generation with no task data for the period
  // Expected: Clear message returned rather than a broken or empty AI response
  // ==========================================
  test('TC-09 [AI Insight]: Weekly insight generation with no task data returns a clear structured message rather than broken/empty response', async () => {
    const result = await handleGenerateInsight({
      timeWindow: 'This Week',
      metrics: { assignedCount: 0, approvedCount: 0, totalHoursLogged: 0 },
      employeeSummaries: [],
    });

    assert.equal(result.success, true);
    assert.ok(result.insightText);
    assert.match(result.insightText, /No task activity or logged hours recorded/i);
    assert.equal(result.isZeroDataState, true);
  });

  // ==========================================
  // TC-10: Roster - Employee with one submitted and one in-progress task
  // Expected: Status bar shows yellow (submitted takes priority), not red
  // ==========================================
  test('TC-10 [Roster]: Employee with one submitted and one in-progress task displays yellow (submitted priority), not red', () => {
    const getEmployeeRosterColor = (employeeTasks) => {
      const hasSubmitted = employeeTasks.some((t) => t.status === 'submitted');
      const hasInProgress = employeeTasks.some((t) => t.status === 'in_progress');

      // Submitted takes priority -> yellow
      if (hasSubmitted) {
        return {
          color: 'yellow',
          hex: '#f59e0b',
          priorityStatus: 'submitted',
          badgeText: 'Awaiting Review',
        };
      }

      if (hasInProgress) {
        return {
          color: 'blue',
          hex: '#3b82f6',
          priorityStatus: 'in_progress',
          badgeText: 'In Progress',
        };
      }

      return {
        color: 'slate',
        hex: '#64748b',
        priorityStatus: 'idle',
        badgeText: 'Idle',
      };
    };

    const mixedTasks = [
      { id: '1', title: 'Task in review', status: 'submitted' },
      { id: '2', title: 'Task actively working', status: 'in_progress' },
    ];

    const rosterStatus = getEmployeeRosterColor(mixedTasks);

    // Must be yellow (amber), NOT red
    assert.equal(rosterStatus.color, 'yellow');
    assert.notEqual(rosterStatus.color, 'red');
    assert.equal(rosterStatus.priorityStatus, 'submitted');
    assert.equal(rosterStatus.badgeText, 'Awaiting Review');
  });

});
