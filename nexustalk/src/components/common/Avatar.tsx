import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  className?: string; // tailwind size classes, e.g. "w-12 h-12"
}

/** User avatar with a gradient-initial fallback when no photo exists. */
export const Avatar: React.FC<AvatarProps> = ({ src, name, className = 'w-12 h-12 text-lg' }) => {
  if (src) {
    return <img src={src} alt={name} className={`${className} rounded-full object-cover ring-1 ring-white/10`} />;
  }
  const initial = (name || 'N').charAt(0).toUpperCase();
  return (
    <div className={`${className} rounded-full accent-gradient on-accent flex items-center justify-center font-bold shrink-0 select-none`}>
      {initial}
    </div>
  );
};
