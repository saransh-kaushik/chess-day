import React from 'react';

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = '#3b82f6' }) => {
  return (
    <span style={{ backgroundColor: color }} className="text-white text-xs px-2 py-1 rounded">
      {children}
    </span>
  );
};
