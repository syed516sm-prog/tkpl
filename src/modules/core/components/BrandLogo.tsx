import React from 'react';

export const BRAND_LOGO_SRC = '/assets/brand-logo.svg';
export const BRAND_MARK_SRC = '/assets/brand-mark.svg';
export const ROUND_LOGO_SRC = '/assets/round-logo.webp';
export const ROUND_LOGO_PNG = '/assets/round-logo.png';

interface BrandMarkProps {
  className?: string;
  size?: number;
}

/**
 * Square nav/footer mark. Vector trace of the artwork's ball + lightning cluster,
 * transparent background, crisp at any size.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ className = '', size = 40 }) => (
  <span
    aria-hidden="true"
    className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
    style={{ width: size, height: size }}
  >
    <img
      src={BRAND_MARK_SRC}
      alt=""
      draggable={false}
      className="h-full w-full object-contain"
    />
  </span>
);

interface RoundLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official circular emblem for Sultan Sports.
 */
export const RoundLogo: React.FC<RoundLogoProps> = ({ className = '', size = 38 }) => (
  <picture className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
    <source srcSet={ROUND_LOGO_SRC} type="image/webp" />
    <img
      src={ROUND_LOGO_PNG}
      alt="Sultan Sports"
      draggable={false}
      style={{ width: size, height: size }}
      className="rounded-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
    />
  </picture>
);

interface BrandWordmarkProps {
  className?: string;
}

export const BrandWordmark: React.FC<BrandWordmarkProps> = ({ className = '' }) => (
  <span className={`font-display leading-none ${className}`}>
    <span className="brand-text-gradient block text-[15px] font-black tracking-[0.16em] uppercase sm:text-base">
      TKPL
    </span>
    <span className="mt-1 block text-[9px] font-bold tracking-[0.24em] text-white uppercase whitespace-nowrap">
      Kadapa Premier League
    </span>
  </span>
);
