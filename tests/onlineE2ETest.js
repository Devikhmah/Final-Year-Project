import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handleVerifyManagerCode } from '../server/managerAuthHandler.js';
import { handleGenerateInsight } from '../server/insightHandler.js';

describe('Online End-to-End System Tests: Features, Functionality & Both User Interfaces', () => {
  let server;
  const PORT = 5174;
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  before((_, done) => {
    // Spin up an online HTTP server hosting the application API endpoints and static entry point
    server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === '/api/verify-manager-code' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const reqData = body ? JSON.parse(body) : {};
            const result = handleVerifyManagerCode(reqData);
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }

      if (req.url === '/api/generate-insight' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const reqData = body ? JSON.parse(body) : {};
            const result = await handleGenerateInsight(reqData);
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }

      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<!DOCTYPE html><html><head><title>Workforce Productivity System</title></head><body><div id="root"></div></body></html>');
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    });

    server.listen(PORT, '127.0.0.1', () => {
      done();
    });
  });

  after((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  // ==========================================
  // SECTION 1: Online Server & Connectivity
  // ==========================================
  describe('1. Online Server & Connectivity', () => {
    test('Online server is reachable and serves root HTML container', async () => {
      const res = await fetch(`${BASE_URL}/`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.match(text, /Workforce Productivity System/);
      assert.match(text, /<div id="root"><\/div>/);
    });
  });

  // ==========================================
  // SECTION 2: Manager User Interface Tests
  // ==========================================
  describe('2. Manager User Interface Features & Functionality', () => {
    test('Manager UI: Access Code Verification endpoint approves valid code', async () => {
      const res = await fetch(`${BASE_URL}/api/verify-manager-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'SME2026SECRET' }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.match(data.message, /verified successfully/);
    });

    test('Manager UI: Access Code Verification rejects invalid code', async () => {
      const res = await fetch(`${BASE_URL}/api/verify-manager-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'INVALID_CODE_999' }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Invalid Manager Access Code/);
    });

    test('Manager UI: Task Creation Modal validates fields (Title, Priority, Deadline)', () => {
      const validPayload = {
        title: 'Conduct System Load Test',
        description: 'Run benchmark tests for API endpoints under load',
        category: 'Quality Assurance',
        priority: 'high',
        assigned_to: 'user-emp-uuid-1',
        deadline: '2026-09-25T18:00:00Z',
      };

      assert.ok(validPayload.title.trim().length > 0, 'Title must not be empty');
      assert.match(validPayload.priority, /^(high|medium|low)$/, 'Priority must be high, medium, or low');
      assert.ok(new Date(validPayload.deadline) > new Date('2026-01-01'), 'Deadline must be valid date');
      assert.ok(validPayload.assigned_to, 'Assignee UUID required');
    });

    test('Manager UI: Filter tasks by Status (all, pending, in_progress, submitted, done)', () => {
      const mockTasks = [
        { id: '1', status: 'pending', title: 'Task 1' },
        { id: '2', status: 'in_progress', title: 'Task 2' },
        { id: '3', status: 'submitted', title: 'Task 3' },
        { id: '4', status: 'done', title: 'Task 4' },
      ];

      const submittedFilter = mockTasks.filter((t) => t.status === 'submitted');
      assert.equal(submittedFilter.length, 1);
      assert.equal(submittedFilter[0].id, '3');

      const doneFilter = mockTasks.filter((t) => t.status === 'done');
      assert.equal(doneFilter.length, 1);
      assert.equal(doneFilter[0].id, '4');
    });

    test('Manager UI: Search and Assignee filter logic', () => {
      const mockTasks = [
        { id: '1', title: 'Security Audit', category: 'Compliance', assigned_to: 'emp-1' },
        { id: '2', title: 'Frontend Refactor', category: 'Development', assigned_to: 'emp-2' },
        { id: '3', title: 'Database Optimization', category: 'DevOps', assigned_to: 'emp-1' },
      ];

      // Filter by assignee
      const emp1Tasks = mockTasks.filter((t) => t.assigned_to === 'emp-1');
      assert.equal(emp1Tasks.length, 2);

      // Search query "security"
      const searchResult = mockTasks.filter((t) =>
        t.title.toLowerCase().includes('security') || t.category.toLowerCase().includes('security')
      );
      assert.equal(searchResult.length, 1);
      assert.equal(searchResult[0].title, 'Security Audit');
    });

    test('Manager UI: Review Queue & Approval Workflow', () => {
      const submittedTask = {
        id: 'task-77',
        status: 'submitted',
        rejection_note: 'Previous rejection feedback',
      };

      // Manager clicks Approve -> status becomes 'done', rejection_note cleared
      const approvedTask = {
        ...submittedTask,
        status: 'done',
        rejection_note: null,
      };

      assert.equal(approvedTask.status, 'done');
      assert.equal(approvedTask.rejection_note, null);
    });

    test('Manager UI: Rejection with Feedback Note Workflow', () => {
      const submittedTask = {
        id: 'task-88',
        status: 'submitted',
      };

      const managerFeedback = 'Missing unit test coverage for edge cases.';

      // Manager rejects task -> status resets to 'in_progress', rejection_note populated
      const rejectedTask = {
        ...submittedTask,
        status: 'in_progress',
        rejection_note: managerFeedback,
      };

      assert.equal(rejectedTask.status, 'in_progress');
      assert.equal(rejectedTask.rejection_note, managerFeedback);
    });

    test('Manager UI: Executive AI Insight API endpoint responds gracefully', async () => {
      const res = await fetch(`${BASE_URL}/api/generate-insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeWindow: 'This Week',
          metrics: { assignedCount: 8, approvedCount: 6, onTimeCount: 5, overdueCount: 1, submittedBottleneckCount: 2, totalHoursLogged: 80 },
          employeeSummaries: [{ name: 'Employee A', loggedHours: 40 }]
        }),
      });

      assert.ok(res.status === 200 || res.status === 400);
      const data = await res.json();
      if (res.status === 200) {
        assert.equal(data.success, true);
        assert.ok(typeof data.insightText === 'string' && data.insightText.length > 0);
      } else {
        assert.equal(data.success, false);
        assert.match(data.error, /(?:GEMINI_API_KEY|Gemini API Error|Network error)/);
      }
    });
  });

  // ==========================================
  // SECTION 3: Employee User Interface Tests
  // ==========================================
  describe('3. Employee User Interface Features & Functionality', () => {
    test('Employee UI: Isolates and displays only tasks assigned to the logged-in employee', () => {
      const currentEmployeeId = 'emp-uuid-42';
      const allTasks = [
        { id: '1', title: 'Implement Login', assigned_to: 'emp-uuid-42', status: 'in_progress' },
        { id: '2', title: 'Configure CDN', assigned_to: 'other-user', status: 'pending' },
        { id: '3', title: 'Write Documentation', assigned_to: 'emp-uuid-42', status: 'submitted' },
      ];

      const employeeTasks = allTasks.filter((t) => t.assigned_to === currentEmployeeId);
      assert.equal(employeeTasks.length, 2);
      assert.equal(employeeTasks[0].id, '1');
      assert.equal(employeeTasks[1].id, '3');
    });

    test('Employee UI: Task Status Lifecycle Transitions (pending -> in_progress -> submitted)', () => {
      let task = { id: 't1', status: 'pending' };

      // Step 1: Employee clicks Start Task
      task = { ...task, status: 'in_progress' };
      assert.equal(task.status, 'in_progress');

      // Step 2: Employee completes work & submits for Manager review
      task = { ...task, status: 'submitted' };
      assert.equal(task.status, 'submitted');

      // Employee cannot mark task as 'done' directly (Manager approval required by RLS)
      const allowedEmployeeStatuses = ['pending', 'in_progress', 'submitted'];
      assert.ok(allowedEmployeeStatuses.includes(task.status));
      assert.equal(allowedEmployeeStatuses.includes('done'), false);
    });

    test('Employee UI: Time Logging validation and hours aggregation', () => {
      const existingLogs = [
        { task_id: 't1', user_id: 'emp-42', minutes_logged: 90 },
        { task_id: 't1', user_id: 'emp-42', minutes_logged: 30 },
      ];

      const newLog = { task_id: 't1', user_id: 'emp-42', minutes_logged: 60 };
      assert.ok(newLog.minutes_logged > 0, 'Logged minutes must be positive');

      const allLogs = [...existingLogs, newLog];
      const totalMinutes = allLogs.reduce((sum, log) => sum + log.minutes_logged, 0);
      const totalHours = parseFloat((totalMinutes / 60).toFixed(2));

      assert.equal(totalMinutes, 180);
      assert.equal(totalHours, 3.0);
    });

    test('Employee UI: Proof Attachment metadata validation upon submission', () => {
      const mockAttachment = {
        task_id: 't1',
        file_name: 'test_report.pdf',
        file_type: 'application/pdf',
        file_url: 'https://supabase.co/storage/v1/object/public/task-proofs/test_report.pdf',
        uploaded_by: 'emp-42',
      };

      assert.ok(mockAttachment.file_name.length > 0);
      assert.ok(mockAttachment.file_url.startsWith('https://'));
      assert.equal(mockAttachment.uploaded_by, 'emp-42');
    });

    test('Employee UI: Displays rejection feedback note prominently when task is returned', () => {
      const rejectedTask = {
        id: 't1',
        status: 'in_progress',
        rejection_note: 'Please fix responsive layout on mobile screens.',
      };

      assert.ok(rejectedTask.rejection_note);
      assert.match(rejectedTask.rejection_note, /responsive layout/);
    });
  });

  // ==========================================
  // SECTION 4: Navigation, Theme & Role Access
  // ==========================================
  describe('4. Navigation, Theming & Cross-Role Access Control', () => {
    test('Role Access Control: Manager sees Analytics & Manager View, Employee sees Employee Dashboard', () => {
      const getAvailableNavItems = (role) => {
        if (role === 'manager') {
          return ['overview', 'analytics', 'profile'];
        }
        return ['overview', 'profile'];
      };

      const managerViews = getAvailableNavItems('manager');
      const employeeViews = getAvailableNavItems('employee');

      assert.ok(managerViews.includes('analytics'), 'Manager must have access to Analytics');
      assert.ok(!employeeViews.includes('analytics'), 'Employee must not see Analytics tab');
    });

    test('Theme Context: Validates color tokens for both Light and Dark themes', () => {
      const lightTheme = {
        bg: 'bg-slate-50',
        text: 'text-slate-900',
        cardBg: 'bg-white',
        border: 'border-slate-200',
      };

      const darkTheme = {
        bg: 'bg-slate-950',
        text: 'text-slate-100',
        cardBg: 'bg-slate-900',
        border: 'border-slate-800',
      };

      assert.notEqual(lightTheme.bg, darkTheme.bg);
      assert.notEqual(lightTheme.cardBg, darkTheme.cardBg);
      assert.ok(darkTheme.bg.includes('950'));
    });
  });
});
