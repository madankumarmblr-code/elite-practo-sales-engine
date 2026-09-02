import React from 'react';

/**
 * Official Practo Brand Logo Component (• practo •)
 * Faithfully matches the official Practo branding with:
 *  - Left vibrant cyan dot (#28B8E8)
 *  - Bold navy wordmark "practo" (#233876)
 *  - Right vibrant cyan dot (#28B8E8)
 */
export function PractoLogo({
  size = 'md',
  variant = 'full', // 'full' | 'icon'
  colorMode = 'light', // 'light' | 'dark' | 'auto'
  showTag = false,
  tagText = 'SALES AI',
  className = '',
  style = {},
}) {
  // Dimension definitions
  const dimensions = {
    xs: { width: 90, height: 26, fontSize: 20, dotRadius: 4.5, tagFont: '8px', gap: '6px' },
    sm: { width: 110, height: 32, fontSize: 24, dotRadius: 5.5, tagFont: '9px', gap: '8px' },
    md: { width: 140, height: 40, fontSize: 30, dotRadius: 7, tagFont: '10px', gap: '10px' },
    lg: { width: 180, height: 50, fontSize: 38, dotRadius: 9, tagFont: '11px', gap: '12px' },
    xl: { width: 230, height: 64, fontSize: 48, dotRadius: 11, tagFont: '12px', gap: '14px' },
    hero: { width: 280, height: 78, fontSize: 58, dotRadius: 13.5, tagFont: '13px', gap: '16px' },
  };

  const dim = dimensions[size] || dimensions.md;
  const navyColor = colorMode === 'dark' ? '#FFFFFF' : '#233876';
  const cyanColor = '#28B8E8';

  if (variant === 'icon') {
    return (
      <div
        className={`practo-logo-icon ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: dim.height,
          height: dim.height,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #233876 0%, #1E293B 100%)',
          boxShadow: '0 4px 12px rgba(35, 56, 118, 0.25)',
          userSelect: 'none',
          ...style,
        }}
      >
        <svg width={dim.height * 0.75} height={dim.height * 0.75} viewBox="0 0 36 36" fill="none">
          <circle cx="8" cy="18" r="4" fill={cyanColor} />
          <text
            x="18"
            y="25"
            fontFamily="'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
            fontWeight="900"
            fontSize="22"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            p
          </text>
          <circle cx="28" cy="18" r="4" fill={cyanColor} />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`practo-brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dim.gap,
        userSelect: 'none',
        ...style,
      }}
    >
      <svg
        width={dim.width}
        height={dim.height}
        viewBox="0 0 190 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Left Vibrant Cyan Dot */}
        <circle cx="12" cy="28" r="9" fill={cyanColor} />

        {/* Wordmark "practo" in Authentic Bold Typography */}
        <text
          x="30"
          y="39"
          fontFamily="'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
          fontWeight="900"
          fontSize="44"
          fill={navyColor}
          letterSpacing="-1.8px"
        >
          practo
        </text>

        {/* Right Vibrant Cyan Dot */}
        <circle cx="178" cy="28" r="9" fill={cyanColor} />
      </svg>

      {/* Optional Enterprise Tag */}
      {showTag && (
        <span
          style={{
            fontSize: dim.tagFont,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#28B8E8',
            background: 'rgba(40, 184, 232, 0.1)',
            border: '1px solid rgba(40, 184, 232, 0.25)',
            padding: '2px 8px',
            borderRadius: '100px',
            display: 'inline-block',
            alignSelf: 'center',
          }}
        >
          {tagText}
        </span>
      )}
    </div>
  );
}

export default PractoLogo;
