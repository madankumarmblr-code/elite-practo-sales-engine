import React from 'react';

/**
 * Official Practo Brandmark Logo Component
 * Uses the exact official Practo logo attached by the user (•practo• wordmark).
 */
export default function PractoLogo({
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showTagline = false,
  tagline = 'Sales Intelligence AI Engine',
  className = '',
  style = {},
}) {
  const HEIGHTS = {
    sm: 24,
    md: 32,
    lg: 44,
    xl: 56,
  };

  const TAG_SIZES = {
    sm: 9,
    md: 10.5,
    lg: 12,
    xl: 13,
  };

  const h = HEIGHTS[size] || HEIGHTS.md;
  const tagSize = TAG_SIZES[size] || TAG_SIZES.md;

  return (
    <div
      className={`practo-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        userSelect: 'none',
        ...style,
      }}
    >
      <img
        src="/practo-logo.png"
        alt="Practo"
        style={{
          height: h,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
      {showTagline && (
        <div
          style={{
            fontSize: tagSize,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#64748B',
            marginTop: 4,
          }}
        >
          {tagline}
        </div>
      )}
    </div>
  );
}
