import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AttachmentViewer({ attachments = [] }) {
  const { themeTokens: t } = useTheme();

  if (attachments.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>
        Proof Attachments ({attachments.length}):
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => {
          const isImg = att.file_type?.startsWith('image/') || att.file_url?.match(/\.(jpeg|jpg|gif|png|webp)/i);
          return (
            <a
              key={att.id}
              href={att.file_url}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${t.border} ${t.accentBg} hover:opacity-80 transition-all text-xs font-medium text-[#D9A441] focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
            >
              <span>{isImg ? '🖼️' : '📄'}</span>
              <span className="truncate max-w-[140px]">{att.file_name || 'Proof File'}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
