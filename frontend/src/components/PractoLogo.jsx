import React from 'react';

/**
 * Official Practo Brandmark Logo Component
 * Uses the official Practo logo (•practo• wordmark) with customizable size and alignment.
 */
export default function PractoLogo({
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showTagline = false,
  tagline = 'Sales Intelligence AI Engine',
  className = '',
  style = {},
  align = 'left', // 'left' | 'center'
}) {
  const HEIGHTS = {
    sm: 24,
    md: 32,
    lg: 44,
    xl: 52,
  };

  const TAG_SIZES = {
    sm: 9,
    md: 10.5,
    lg: 11.5,
    xl: 12.5,
  };

  const h = HEIGHTS[size] || HEIGHTS.md;
  const tagSize = TAG_SIZES[size] || TAG_SIZES.md;
  const isCenter = align === 'center';

  return (
    <div
      className={`practo-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: isCenter ? 'center' : 'flex-start',
        textAlign: isCenter ? 'center' : 'left',
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
          margin: isCenter ? '0 auto' : undefined,
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
            marginTop: 6,
            textAlign: isCenter ? 'center' : 'left',
          }}
        >
          {tagline}
        </div>
      )}
    </div>
  );
}
