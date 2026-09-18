import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Supabase Database Schema & RLS Policy Validation', () => {
  const sqlFilePath = path.resolve(process.cwd(), 'supabase_setup.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  test('supabase_setup.sql file exists and is non-empty', () => {
    assert.ok(sqlContent.length > 500);
  });

  test('defines required core tables: users, tasks, time_logs, task_attachments', () => {
    assert.match(sqlContent, /CREATE TABLE IF NOT EXISTS public\.users/i);
    assert.match(sqlContent, /CREATE TABLE IF NOT EXISTS public\.tasks/i);
    assert.match(sqlContent, /CREATE TABLE IF NOT EXISTS public\.time_logs/i);
    assert.match(sqlContent, /CREATE TABLE IF NOT EXISTS public\.task_attachments/i);
  });

  test('enforces RLS on all 4 core tables', () => {
    assert.match(sqlContent, /ALTER TABLE public\.users ENABLE ROW LEVEL SECURITY/i);
    assert.match(sqlContent, /ALTER TABLE public\.tasks ENABLE ROW LEVEL SECURITY/i);
    assert.match(sqlContent, /ALTER TABLE public\.time_logs ENABLE ROW LEVEL SECURITY/i);
    assert.match(sqlContent, /ALTER TABLE public\.task_attachments ENABLE ROW LEVEL SECURITY/i);
  });

  test('defines 4-stage task status constraint (pending, in_progress, submitted, done)', () => {
    assert.match(sqlContent, /CHECK\s*\(\s*status IN\s*\('pending',\s*'in_progress',\s*'submitted',\s*'done'\)\s*\)/i);
  });

  test('includes is_manager() security helper function', () => {
    assert.match(sqlContent, /CREATE OR REPLACE FUNCTION public\.is_manager\(\)/i);
    assert.match(sqlContent, /SECURITY DEFINER/i);
  });

  test('includes automatic profile creation trigger for auth.users', () => {
    assert.match(sqlContent, /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)/i);
    assert.match(sqlContent, /CREATE TRIGGER on_auth_user_created/i);
  });

  test('includes permanent role immutability trigger', () => {
    assert.match(sqlContent, /CREATE OR REPLACE FUNCTION public\.prevent_role_update\(\)/i);
    assert.match(sqlContent, /Role updates are strictly prohibited/i);
  });
});
