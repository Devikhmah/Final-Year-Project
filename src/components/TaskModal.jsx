import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function TaskModal({ isOpen, onClose, taskToEdit, employees, onSaved }) {
  const { themeTokens: t } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Operations');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setCategory(taskToEdit.category || 'Operations');
      setPriority(taskToEdit.priority || 'medium');
      setAssignedTo(taskToEdit.assigned_to || '');
      setDeadline(taskToEdit.deadline ? taskToEdit.deadline.split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setCategory('Operations');
      setPriority('medium');
      setAssignedTo(employees[0]?.id || '');
      setDeadline('');
    }
  }, [taskToEdit, employees, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Task title is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        category,
        priority,
        assigned_to: assignedTo || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      };

      if (taskToEdit) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', taskToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tasks').insert([{ ...payload, status: 'pending' }]);
        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (err) {
      alert('Failed to save task: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className={`w-full max-w-lg ${t.modalBg} border ${t.border} rounded-2xl p-6 shadow-2xl space-y-5`}>
        <div className={`flex items-center justify-between border-b ${t.border} pb-3`}>
          <h3 className={`text-lg font-bold ${t.heading}`}>
            {taskToEdit ? 'Edit Task Assignment' : 'Create New Task Assignment'}
          </h3>
          <button onClick={onClose} className={`${t.muted} hover:${t.heading} p-1 focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}>
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className={`block font-bold uppercase ${t.muted} mb-1`}>Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3.5 py-2 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              placeholder="e.g. Weekly Operations Audit"
            />
          </div>

          <div>
            <label className={`block font-bold uppercase ${t.muted} mb-1`}>Description</label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-3.5 py-2 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              placeholder="Provide clear instructions and expected deliverables..."
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block font-bold uppercase ${t.muted} mb-1`}>Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-3 py-2 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
                placeholder="Sales, Operations, Admin..."
              />
            </div>

            <div>
              <label className={`block font-bold uppercase ${t.muted} mb-1`}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={`w-full px-3 py-2 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block font-bold uppercase ${t.muted} mb-1`}>Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={`w-full px-3 py-2 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block font-bold uppercase ${t.muted} mb-1`}>Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={`w-full px-3 py-2 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              />
            </div>
          </div>

          <div className={`flex justify-end gap-3 pt-4 border-t ${t.border}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 ${t.accentBg} ${t.text} rounded-xl font-bold border ${t.border} focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] font-bold rounded-xl shadow disabled:opacity-50 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#1B4B4F]"
            >
              <span>{saving ? 'Saving Task...' : taskToEdit ? 'Save Changes' : 'Assign Task'}</span>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
