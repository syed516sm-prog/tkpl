import React from 'react';

export const BRAND_LOGO_SRC = '/assets/brand-logo.svg';
export const BRAND_MARK_SRC = '/assets/brand-mark.svg';
export const ROUND_LOGO_SRC = '/assets/round-logo.webp';
export const ROUND_LOGO_PNG = '/assets/round-logo.png';
export const NR_LOGO_SRC = '/assets/nr-sports-logo.webp';

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

interface NrLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official circular emblem for NR Sports (Vempalli).
 */
export const NrLogo: React.FC<NrLogoProps> = ({ className = '', size = 38 }) => (
  <span
    aria-hidden="true"
    className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
    style={{ width: size, height: size }}
  >
    <img
      src={NR_LOGO_SRC}
      alt="NR Sports"
      draggable={false}
      style={{ width: size, height: size }}
      className="rounded-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
    />
  </span>
);

interface BrandWordmarkProps {
  className?: string;
}

export const BrandWordmark: React.FC<BrandWordmarkProps> = ({ className = '' }) => (
  <span className={`font-display leading-none min-w-0 ${className}`}>
    <span className="brand-text-gradient block text-[13px] font-black tracking-[0.14em] uppercase sm:text-base sm:tracking-[0.16em]">
      TKPL
    </span>
    <span className="mt-0.5 block text-[7.5px] font-bold tracking-[0.12em] text-white uppercase whitespace-nowrap sm:mt-1 sm:text-[9.5px] sm:tracking-[0.24em]">
      Kadapa Premier League
    </span>
  </span>
);
