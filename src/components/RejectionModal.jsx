import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function RejectionModal({ isOpen, onClose, onConfirm }) {
  const { themeTokens: t } = useTheme();
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!note.trim()) {
      alert('Please provide feedback notes explaining why the submission needs revision.');
      return;
    }
    onConfirm(note);
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className={`w-full max-w-md ${t.modalBg} border ${t.border} rounded-2xl p-6 shadow-2xl space-y-4`}>
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
          <h3 className="text-base font-bold text-rose-500 flex items-center gap-2">
            <span>Reject Submission & Request Revision</span>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </h3>
          <button onClick={onClose} className={`${t.muted} hover:${t.heading} p-1 focus:outline-none focus:ring-2 focus:ring-rose-400`}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className={`text-xs ${t.muted} leading-relaxed`}>
          Please detail what changes or missing proof files the employee needs to fix before resubmitting.
        </p>

        <div>
          <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
            Rejection Feedback Note *
          </label>
          <textarea
            rows="3"
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Please attach the signed customer receipt..."
            className={`w-full px-3 py-2 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-rose-500` }
          ></textarea>
        </div>

        <div className={`flex justify-end gap-3 pt-3 border-t ${t.border}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 ${t.accentBg} ${t.text} rounded-xl text-xs font-bold border ${t.border} focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <span>Reject Task & Send Note</span>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
