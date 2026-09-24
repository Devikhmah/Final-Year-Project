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

  const [downloadingId, setDownloadingId] = React.useState(null);

  const handleDownload = async (att, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!att?.file_url) return;

    const fileName = att.file_name || 'proof-of-completion';
    setDownloadingId(att.id);

    try {
      if (att.file_url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = att.file_url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const response = await fetch(att.file_url);
        if (!response.ok) throw new Error('Fetch failed');
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
    } catch (err) {
      console.warn('Direct blob download error, triggering browser direct link:', err);
      const link = document.createElement('a');
      link.href = att.file_url;
      link.target = '_blank';
      link.download = fileName;
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloadingId(null), 600);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < attachments.length; i++) {
      await handleDownload(attachments[i]);
      // Small stagger between multiple downloads
      await new Promise((res) => setTimeout(res, 300));
    }
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>
          Proof of Completion ({attachments.length}):
        </p>
        {attachments.length > 1 && (
          <button
            type="button"
            onClick={handleDownloadAll}
            className="text-[10px] font-bold text-[#D9A441] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
            title="Download all attached proof files"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download All ({attachments.length})</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => {
          const { icon, label, color } = renderFileIcon(att.file_name, att.file_type);
          const isDownloading = downloadingId === att.id;

          return (
            <div
              key={att.id}
              className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border transition-all text-xs font-medium ${color} shadow-sm group`}
            >
              {icon}
              <a
                href={att.file_url}
                target="_blank"
                rel="noreferrer"
                title={`Open/Preview ${label}: ${att.file_name || 'Proof File'}`}
                className="truncate max-w-[130px] hover:underline cursor-pointer"
              >
                {att.file_name || 'Proof File'}
              </a>

              {/* Explicit Download Action Button */}
              <button
                type="button"
                onClick={(e) => handleDownload(att, e)}
                disabled={isDownloading}
                title={`Download ${att.file_name || 'Proof File'}`}
                className="p-1 rounded hover:bg-black/20 text-current opacity-80 hover:opacity-100 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D9A441]"
              >
                {isDownloading ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
