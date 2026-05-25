import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: number | string;
  className?: string;
  background?: 'warm' | 'light' | 'spicy' | 'default';
}

export function PageLayout({
  children,
  maxWidth = '100%',
  className = '',
}: PageLayoutProps) {
  return (
    <div
      className={`page-container fluid-layout ${className}`}
      style={{
        maxWidth,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}

export default PageLayout;