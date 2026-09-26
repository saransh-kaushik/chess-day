import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ children, variant = 'primary', className = '', ...props }) => {
  const base = 'px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98]';
  const variants = {
    primary: 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/15',
    secondary: 'border border-white/10 bg-white/5 hover:bg-white/10 text-slate-100',
    danger: 'bg-rose-500/90 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/20',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
