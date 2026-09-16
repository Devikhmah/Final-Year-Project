import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AttachmentViewer({ attachments = [] }) {
  const { themeTokens: t } = useTheme();

  if (attachments.length === 0) return null;

  const renderFileIcon = (fileName, fileType) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    const mime = fileType?.toLowerCase() || '';

    // 1. Source Codes (Code Bracket Icon </>)
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'json', 'html', 'css', 'sql', 'sh', 'cpp', 'c', 'java', 'php', 'rb', 'go', 'rs'].includes(ext) || mime.includes('javascript') || mime.includes('json') || mime.includes('python')) {
      return {
        icon: (
          <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        ),
        label: 'Source Code',
        color: 'text-teal-400 border-teal-500/30 bg-teal-500/10'
      };
    }

    // 2. PDF (Red PDF Document Icon)
    if (mime.includes('pdf') || ext === 'pdf') {
      return {
        icon: (
          <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h1m0 4h6m-6 4h4" />
          </svg>
        ),
        label: 'PDF Document',
        color: 'text-rose-400 border-rose-500/30 bg-rose-500/10'
      };
    }

    // 3. PowerPoint / Presentations (Orange Presentation Screen Icon)
    if (mime.includes('presentation') || mime.includes('powerpoint') || ['ppt', 'pptx', 'key'].includes(ext)) {
      return {
        icon: (
          <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12H4z" />
          </svg>
        ),
        label: 'PowerPoint',
        color: 'text-orange-400 border-orange-500/30 bg-orange-500/10'
      };
    }

    // 4. Video (Pink Video Camera Icon)
    if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'].includes(ext)) {
      return {
        icon: (
          <svg className="w-4 h-4 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0021 8.618v6.764a1 1 0 00-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ),
        label: 'Video Recording',
        color: 'text-pink-400 border-pink-500/30 bg-pink-500/10'
      };
    }

    // Images
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      return {
        icon: (
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        label: 'Image',
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      };
    }

    // Word / Document
    if (mime.includes('word') || mime.includes('document') || ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
      return {
        icon: (
          <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        label: 'Document',
        color: 'text-blue-400 border-blue-500/30 bg-blue-500/10'
      };
    }

    // Spreadsheets
    if (mime.includes('sheet') || mime.includes('excel') || ['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
      return {
        icon: (
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        label: 'Spreadsheet',
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      };
    }

    // Zip / Archives
    if (mime.includes('zip') || mime.includes('compressed') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return {
        icon: (
          <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        ),
        label: 'Archive',
        color: 'text-purple-400 border-purple-500/30 bg-purple-500/10'
      };
    }

    // Audio
    if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return {
        icon: (
          <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        ),
        label: 'Audio',
        color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
      };
    }

    // Default Proof File
    return {
      icon: (
        <svg className="w-4 h-4 text-[#D9A441] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Proof File',
      color: 'text-[#D9A441] border-[#D9A441]/30 bg-[#D9A441]/10'
    };
  };

  return (
    <div className="space-y-1.5 pt-1">
      <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>
        Proof Attachments ({attachments.length}):
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => {
          const { icon, label, color } = renderFileIcon(att.file_name, att.file_type);
          return (
            <a
              key={att.id}
              href={att.file_url}
              target="_blank"
              rel="noreferrer"
              title={`View/Download ${label}: ${att.file_name || 'Proof File'}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs font-medium ${color} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#D9A441] shadow-sm`}
            >
              {icon}
              <span className="truncate max-w-[140px]">{att.file_name || 'Proof File'}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
