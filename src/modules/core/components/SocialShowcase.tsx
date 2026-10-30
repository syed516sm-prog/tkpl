import React from 'react';
import { ArrowSquareOut, MapPin, Sparkle, Users, FilmStrip, CheckCircle } from '@phosphor-icons/react';
import { BrandMark, RoundLogo } from './BrandLogo';
import {
  InstagramIcon,
  TKPL_INSTAGRAM_URL,
  SULTAN_INSTAGRAM_URL,
} from './InstagramFollowSection';

export const SULTAN_MAPS_URL = 'https://maps.app.goo.gl/YqyUnyCADBZgvGBB8?g_st=ac';

export const SocialShowcase: React.FC = () => {
  return (
    <section
      aria-label="Official Instagram Channels"
      className="relative border-b border-white/[0.08] px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/35 bg-pink-500/10 px-3.5 py-1 text-[11px] font-bold tracking-[0.24em] text-pink-400 uppercase shadow-[0_0_20px_rgba(236,72,153,0.15)]">
            <InstagramIcon className="h-3.5 w-3.5 text-pink-400" />
            <span>Follow Us on Instagram</span>
          </div>

          <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]">
            Follow The{' '}
            <span className="bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] bg-clip-text text-transparent">
              Action
            </span>
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base font-medium leading-relaxed text-zinc-300">
            Follow the official TKPL league channel and Sultan Sports Kadapa for real-time player auction bids, match reels, daily fixtures, and exclusive tournament updates.
          </p>
        </div>

        {/* 2-Card Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1: TKPL Official Tournament */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#1a0814]/90 via-zinc-950/95 to-black/95 p-6 sm:p-7 shadow-[0_16px_45px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 hover:border-pink-500/40 hover:shadow-[0_0_35px_rgba(236,72,153,0.2)]">
            {/* Top decorative gradient sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888]"
            />

            <div>
              {/* Header with Avatar & Handle */}
              <div className="flex items-start gap-4">
                <div className="relative shrink-0 rounded-2xl p-1 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-md">
                  <div className="rounded-xl bg-black p-1.5 flex items-center justify-center">
                    <BrandMark size={44} className="h-11 w-11" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display text-base sm:text-lg font-black tracking-wide text-white truncate">
                      TKPL Official
                    </h3>
                    <CheckCircle size={16} weight="fill" className="text-pink-400 shrink-0" />
                  </div>
                  <a
                    href={TKPL_INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-mono text-pink-300 hover:underline truncate"
                  >
                    @tkpl_gurulazer_tennisball_kpl
                  </a>
                  <span className="mt-1 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Official League Channel
                  </span>
                </div>
              </div>

              {/* Instagram Stats Row */}
              <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <div>
                  <span className="block font-display text-base font-black text-white">4</span>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400">Posts</span>
                </div>
                <div className="border-x border-white/10">
                  <span className="block font-display text-base font-black text-pink-400">134+</span>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400">Followers</span>
                </div>
                <div>
                  <span className="block font-display text-base font-black text-amber-400">Season 1</span>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400">Kadapa KPL</span>
                </div>
              </div>

              {/* Bio & Highlights */}
              <div className="mt-5 space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">👑</span>
                  <span>Tennis Ball Cricket · Gully Cricket to Big Stage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">🔥</span>
                  <span>Player Auction Bids &amp; Team Owner Updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-pink-400 font-bold">📍</span>
                  <span>New &amp; Old Kadapa District Players</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="text-zinc-500 font-bold">👤</span>
                  <span>Organized by <strong className="text-zinc-200">Syed Mansoor</strong></span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <a
                href={TKPL_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-pink-900/40 transition hover:brightness-110 active:scale-[0.98]"
              >
                <InstagramIcon className="h-4 w-4" />
                <span>Follow @tkpl_gurulazer...</span>
                <ArrowSquareOut size={15} weight="bold" className="transition-transform group-hover/btn:translate-x-0.5" />
              </a>
            </div>
          </div>

          {/* Card 2: Sultan Sports Kadapa */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#1a0814]/90 via-zinc-950/95 to-black/95 p-6 sm:p-7 shadow-[0_16px_45px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 hover:border-pink-500/40 hover:shadow-[0_0_35px_rgba(236,72,153,0.2)]">
            {/* Top decorative gradient sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888]"
            />

            <div>
              {/* Header with Avatar & Handle */}
              <div className="flex items-start gap-4">
                <div className="relative shrink-0 rounded-2xl p-1 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-md">
                  <div className="rounded-xl bg-black p-1 flex items-center justify-center">
                    <RoundLogo size={46} className="h-11 w-11" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display text-base sm:text-lg font-black tracking-wide text-white truncate">
                      Sultan Sports Kadapa
                    </h3>
                    <CheckCircle size={16} weight="fill" className="text-pink-400 shrink-0" />
                  </div>
                  <a
                    href={SULTAN_INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-mono text-pink-300 hover:underline truncate"
                  >
                    @sultansports_kadapa
                  </a>
                  <span className="mt-1 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Equipment &amp; Trophy Partner
                  </span>
                </div>
              </div>

              {/* Instagram Stats Row */}
              <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <div>
                  <span className="block font-display text-base font-black text-white">220+</span>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400">Posts</span>
                </div>
                <div className="border-x border-white/10">
                  <span className="block font-display text-base font-black text-pink-400">1,180+</span>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400">Followers</span>
                </div>
                <div>
                  <span className="block font-display text-base font-black text-amber-400">Kadapa</span>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400">Showroom</span>
                </div>
              </div>

              {/* Bio & Highlights */}
              <div className="mt-5 space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">🏪</span>
                  <span>A Trusted Sports Showroom in Kadapa</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-pink-400 font-bold">💬</span>
                  <span className="italic">&ldquo;Visit our Sports Showroom, Nachhitheney Konandi 🥰&rdquo;</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">🏏</span>
                  <span>Bats, Balls, Trophies &amp; Match Kits Available</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="text-zinc-500 font-bold">👤</span>
                  <span>Owner: <strong className="text-zinc-200">Mansoor Syed</strong></span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row gap-2.5">
              <a
                href={SULTAN_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] px-4 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-pink-900/40 transition hover:brightness-110 active:scale-[0.98]"
              >
                <InstagramIcon className="h-4 w-4" />
                <span>Follow @sultansports...</span>
                <ArrowSquareOut size={15} weight="bold" className="transition-transform group-hover/btn:translate-x-0.5" />
              </a>

              <a
                href={SULTAN_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-200 transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
                title="Open Sultan Sports in Google Maps"
              >
                <MapPin size={16} weight="fill" className="text-red-400" />
                <span>Showroom Map</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
