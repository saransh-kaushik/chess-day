import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-2',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => (
  <div className="flex justify-center items-center p-2">
    <div
      className={`animate-spin rounded-full border-b-amber-500 border-gray-700 ${SIZE_MAP[size]}`}
      style={{ borderBottomColor: '#f59e0b' }}
    />
  </div>
);
