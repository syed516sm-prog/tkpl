import React from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { BrandMark, RoundLogo } from './BrandLogo';

export const TKPL_INSTAGRAM_URL =
  'https://www.instagram.com/tkpl_gurulazer_tennisball_kpl?exln=Ym8wdzZyMGU1NjNl';
export const SULTAN_INSTAGRAM_URL =
  'https://www.instagram.com/sultansports_kadapa?cplk=cnpuaGozdnppeTc0';

export const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

interface InstagramFollowSectionProps {
  className?: string;
  variant?: 'receipt' | 'banner' | 'compact';
}

export const InstagramFollowSection: React.FC<InstagramFollowSectionProps> = ({
  className = '',
  variant = 'receipt',
}) => {
  return (
    <div
      className={`rounded-2xl border border-pink-500/30 bg-gradient-to-br from-zinc-950 via-[#1a0714] to-zinc-950 p-5 sm:p-6 shadow-xl ${className}`}
    >
      <div className="flex items-center gap-2.5 text-pink-400">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-md">
          <InstagramIcon className="h-4.5 w-4.5" />
        </span>
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-pink-400">
            Official Instagram Channels
          </span>
          <h4 className="text-base sm:text-lg font-extrabold text-white">
            Follow for Auction Bids &amp; Match Highlights!
          </h4>
        </div>
      </div>

      <p className="mt-2.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
        Don’t miss out! Team owner auction bids, player feature reels, live match photos, and schedule announcements are posted directly on our Instagram pages.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* TKPL Official League Handle */}
        <a
          href={TKPL_INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 transition-all hover:border-pink-500/60 hover:bg-gradient-to-r hover:from-pink-950/40 hover:to-zinc-900 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size={32} />
            <div className="min-w-0">
              <span className="block text-xs font-black text-amber-300 group-hover:text-amber-200">
                T-KPL Official
              </span>
              <span className="block truncate text-[11px] font-mono text-zinc-300">
                @tkpl_gurulazer...
              </span>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] px-3 py-1.5 text-[11px] font-bold text-white shadow-md transition-transform group-hover:scale-105">
            <span>Follow</span>
            <ArrowSquareOut size={13} weight="bold" />
          </span>
        </a>

        {/* Sultan Sports Handle */}
        <a
          href={SULTAN_INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 transition-all hover:border-pink-500/60 hover:bg-gradient-to-r hover:from-pink-950/40 hover:to-zinc-900 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <RoundLogo size={32} />
            <div className="min-w-0">
              <span className="block text-xs font-black text-white group-hover:text-amber-300">
                Sultan Sports Kadapa
              </span>
              <span className="block truncate text-[11px] font-mono text-zinc-300">
                @sultansports_kadapa
              </span>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] px-3 py-1.5 text-[11px] font-bold text-white shadow-md transition-transform group-hover:scale-105">
            <span>Follow</span>
            <ArrowSquareOut size={13} weight="bold" />
          </span>
        </a>
      </div>
    </div>
  );
};
