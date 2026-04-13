import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: number;
  className?: string;
  background?: 'warm' | 'light' | 'spicy' | 'default';
}

export function PageLayout({
  children,
  maxWidth = 1200,
  className = '',
}: PageLayoutProps) {
  return (
    <div
      className={`page-container ${className}`}
      style={{
        maxWidth,
        margin: '0 auto',
      }}
    >
      {children}
    </div>
  );
}

export default PageLayout;