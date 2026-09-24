import React, { useState, useEffect } from 'react';

/**
 * Reusable UserAvatar component that displays the user's uploaded profile picture
 * or falls back cleanly to a styled initial badge for faster recognition.
 */
export default function UserAvatar({
  src,
  name = 'User',
  size = 'md',
  className = '',
  showRoleBadge = false,
  role = 'employee',
}) {
  const [imageError, setImageError] = useState(false);

  // Preset size mappings
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded-md',
    sm: 'w-8 h-8 text-xs rounded-lg',
    md: 'w-10 h-10 text-sm rounded-xl',
    lg: 'w-14 h-14 text-xl rounded-2xl',
    xl: 'w-20 h-20 text-2xl rounded-2xl',
    '2xl': 'w-24 h-24 text-3xl rounded-3xl',
  };

  const selectedSizeClass = sizeClasses[size] || sizeClasses.md;

  // Sanitize name to prevent 'undefined' or 'null' from displaying
  const displayName = typeof name === 'string' && name.trim() && name.trim() !== 'undefined' && name.trim() !== 'null'
    ? name.trim()
    : 'User';
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  // Sanitize src URL
  const validSrc = typeof src === 'string' && src.trim() && src.trim() !== 'undefined' && src.trim() !== 'null'
    ? src.trim()
    : null;

  // Reset image error state when src changes
  useEffect(() => {
    setImageError(false);
  }, [src]);

  return (
    <div className={`relative shrink-0 inline-flex items-center justify-center ${className}`}>
      {validSrc && !imageError ? (
        <img
          src={validSrc}
          alt={`${displayName}'s avatar`}
          onError={() => setImageError(true)}
          className={`${selectedSizeClass} object-cover shadow-sm border border-white/20 ring-1 ring-black/10 transition-all`}
        />
      ) : (
        <div
          className={`${selectedSizeClass} bg-[#D9A441] text-[#0D1B1E] flex items-center justify-center font-bold shadow-md shrink-0 border border-[#D9A441]/40 transition-all`}
          title={displayName}
        >
          {initial}
        </div>
      )}

      {showRoleBadge && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
            role === 'manager' ? 'bg-amber-400' : 'bg-teal-400'
          }`}
          title={`Role: ${role}`}
        />
      )}
    </div>
  );
}
