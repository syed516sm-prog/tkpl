import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react';
import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  Lightning,
  MagnifyingGlass,
  Trophy,
  UserPlus,
  YoutubeLogo,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import { formatInrFromPaise } from '../../core/lib/validation';
import { BRAND_LOGO_SRC } from '../../core/components/BrandLogo';
import { OrganizerShowcase } from '../../core/components/OrganizerShowcase';
import { SocialShowcase } from '../../core/components/SocialShowcase';

export const HomePage: React.FC = () => {
  const { settings, players, payments, publicStats, adminSession } = useTournament();
  const preferReducedMotion = useReducedMotion();

  const feeFormatted = formatInrFromPaise(settings.fee_paise);
  const confirmedCount = adminSession
    ? payments.filter((p) => p.status === 'verified').length
    : publicStats?.confirmed_count ??
      publicStats?.auction_eligible_count ??
      publicStats?.registered_count ??
      (payments.length > 0
        ? payments.filter((p) => p.status === 'verified').length
        : players.length);

  const deadlinePassed = Boolean(settings.deadline) && new Date(settings.deadline).getTime() < Date.now();
  const registrationOpen = settings.registration_open && !deadlinePassed;
  const deadlineLabel = settings.deadline
    ? new Date(settings.deadline).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div className="relative overflow-x-hidden text-zinc-100">
      <Hero
        feeFormatted={feeFormatted}
        registrationOpen={registrationOpen}
        deadlineLabel={deadlineLabel}
        season={settings.season}
        reduceMotion={Boolean(preferReducedMotion)}
      />

      <OrganizerShowcase />

      <KeyNumbers
        feeFormatted={feeFormatted}
        registeredCount={confirmedCount}
      />

      <PrizePool />

      <SocialShowcase />

      <ClosingCta feeFormatted={feeFormatted} registrationOpen={registrationOpen} />
    </div>
  );
};

interface HeroProps {
  feeFormatted: string;
  registrationOpen: boolean;
  deadlineLabel: string;
  season: string;
  reduceMotion: boolean;
}

const Hero: React.FC<HeroProps> = ({
  feeFormatted,
  registrationOpen,
  deadlineLabel,
  season,
  reduceMotion,
}) => {
  const pointerX = useSpring(0, { stiffness: 60, damping: 18 });
  const pointerY = useSpring(0, { stiffness: 60, damping: 18 });
  const rotateY = useTransform(pointerX, [-1, 1], [12, -12]) as MotionValue<number>;
  const rotateX = useTransform(pointerY, [-1, 1], [-9, 9]) as MotionValue<number>;
  const glowX = useTransform(pointerX, [-1, 1], ['42%', '58%']) as MotionValue<string>;

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <section className="relative isolate overflow-hidden border-b border-white/[0.08] px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(182,255,46,0.18),transparent_65%),radial-gradient(ellipse_45%_40%_at_85%_15%,rgba(255,210,30,0.12),transparent_60%),radial-gradient(ellipse_50%_45%_at_15%_75%,rgba(225,29,72,0.14),transparent_65%)]"
      />
      {!reduceMotion && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span className="brand-beam absolute -top-24 left-[12%] h-[62%] w-24 origin-top rotate-[16deg]" />
          <span className="brand-beam absolute -top-24 left-1/2 h-[70%] w-32 -translate-x-1/2" />
          <span className="brand-beam absolute -top-24 right-[12%] h-[62%] w-24 origin-top -rotate-[16deg]" />
        </div>
      )}

      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          {/* Official League Eyebrow Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-brand-lime/35 bg-black/60 px-4 py-1.5 shadow-[0_0_20px_rgba(182,255,46,0.15)] backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-lime opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_8px_#b6ff2e]" />
            </span>
            <span className="text-[11px] font-bold tracking-[0.24em] text-white uppercase">
              {season} · Official Tournament Entry
            </span>
          </div>

          {/* Championship Headline */}
          <h1 className="mt-5 font-display text-5xl leading-[0.92] font-black tracking-tight text-white uppercase sm:text-6xl md:text-7xl lg:text-[5.2rem]">
            <span className="block drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">Tennis Ball</span>
            <span className="block brand-text-gradient italic drop-shadow-[0_4px_24px_rgba(182,255,46,0.3)]">
              Kadapa
            </span>
            <span className="block text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
              Premier League
            </span>
          </h1>

          {/* High-Clarity Subtext */}
          <p className="mx-auto mt-5 max-w-lg text-sm sm:text-base font-medium leading-relaxed text-zinc-200 lg:mx-0">
            New &amp; Old Kadapa players only. Register your player profile, pay the official entry
            fee online, and lock in your verified spot for the auction.
          </p>

          {/* Crisp Feature Highlights */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-semibold text-zinc-200 backdrop-blur-md">
              <CheckCircle size={14} weight="fill" className="text-brand-lime" />
              <span>Guru Laser Tennis Ball</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-semibold text-zinc-200 backdrop-blur-md">
              <CheckCircle size={14} weight="fill" className="text-brand-lime" />
              <span>Instant Digital Receipt</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/35 bg-black/45 px-3 py-1 text-xs font-semibold text-zinc-100 backdrop-blur-md shadow-sm">
              <YoutubeLogo size={16} weight="fill" className="text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
              <span>YouTube Live Broadcast</span>
            </span>
          </div>

          {/* Interactive Action Buttons */}
          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
            {registrationOpen ? (
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-brand-lime px-6 py-3.5 text-sm font-black tracking-wide text-brand-ink uppercase shadow-[0_16px_40px_-16px_rgba(182,255,46,0.9)] transition hover:brightness-110 active:scale-[0.98]"
              >
                <UserPlus size={19} weight="bold" />
                <span>Register Now @ {feeFormatted}/-</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-ink/15 transition-transform group-hover:translate-x-1">
                  <ArrowRight size={14} weight="bold" />
                </span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/15 bg-black/50 px-6 py-3.5 text-sm font-black tracking-wide text-zinc-400 uppercase"
              >
                Registrations closed
              </span>
            )}

            <Link
              to="/find-ticket"
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-white/20 bg-black/50 px-6 py-3.5 text-sm font-bold text-white shadow-md backdrop-blur-md transition hover:border-brand-lime hover:bg-black/75 hover:text-brand-lime active:scale-[0.98]"
            >
              <MagnifyingGlass size={18} weight="bold" />
              <span>Find My Ticket</span>
            </Link>
          </div>

          {registrationOpen && deadlineLabel && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-300">
              <CalendarBlank size={15} weight="bold" />
              <span>Entries close {deadlineLabel}</span>
            </p>
          )}
        </div>

        {/* 3D Floating Official Brand Mark with Deep Realistic Shadow */}
        <div
          className="order-1 lg:order-2"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div
            className="relative mx-auto w-full max-w-[500px]"
            style={{ perspective: '1200px' }}
          >
            {/* Ambient Lime Spotlight behind logo */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-brand-lime/15 blur-3xl"
              style={reduceMotion ? undefined : { left: glowX }}
            />
            {/* Deep Volumetric Shadow directly behind the logo */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-6 -z-10 rounded-full bg-black/85 blur-2xl transform translate-y-8"
            />
            <motion.div
              className="relative will-change-transform"
              style={
                reduceMotion
                  ? undefined
                  : { rotateX, rotateY, transformStyle: 'preserve-3d' }
              }
            >
              <div className={reduceMotion ? '' : 'brand-hero-float'}>
                <img
                  src={BRAND_LOGO_SRC}
                  alt="T-KPL official logo: cricket bat, tennis ball and the T-KPL wordmark"
                  className="w-full drop-shadow-[0_22px_30px_rgba(0,0,0,0.9)] drop-shadow-[0_45px_65px_rgba(0,0,0,0.7)] drop-shadow-[0_0_40px_rgba(182,255,46,0.22)]"
                  draggable={false}
                />
              </div>
            </motion.div>
            {/* Ground contact shadow */}
            <div
              aria-hidden="true"
              className="mx-auto mt-4 h-7 w-3/4 rounded-[50%] bg-black/80 blur-xl shadow-[0_0_35px_rgba(0,0,0,0.95)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

interface KeyNumbersProps {
  feeFormatted: string;
  registeredCount: number;
}

const KeyNumbers: React.FC<KeyNumbersProps> = ({ feeFormatted, registeredCount }) => {
  const items = [
    {
      label: 'Player Entry Fee',
      value: `${feeFormatted}/-`,
      sub: 'Official tournament registration',
      live: false,
    },
    {
      label: 'Registered Players',
      value: String(registeredCount),
      sub: 'Confirmed tournament entries',
      live: true,
    },
  ];

  return (
    <section className="relative border-b border-white/[0.08] px-4 py-12 sm:px-6 lg:px-8">
      {/* Glassmorphic Scorecard Container */}
      <div className="relative mx-auto max-w-3xl">
        {/* Soft Ambient Glow under glass */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 -z-10 rounded-3xl bg-brand-lime/10 blur-xl opacity-60"
        />

        <div className="relative grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
          {items.map((item) => (
            <div
              key={item.label}
              className="group relative bg-white/[0.04] px-4 py-6 sm:px-8 sm:py-7 transition-all duration-300 hover:bg-white/[0.08]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-[0.2em] text-white/90 uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  {item.label}
                </p>
                {item.live && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-lime/50 bg-black/50 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-brand-lime uppercase shadow-[0_0_15px_rgba(182,255,46,0.35)] backdrop-blur-md">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-lime opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-lime" />
                    </span>
                    Live
                  </span>
                )}
              </div>
              <p className="mt-2 font-display text-4xl sm:text-5xl font-black tracking-tight text-white tabular-nums drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                {item.value}
              </p>
              <p className="mt-1.5 text-xs sm:text-sm font-semibold text-zinc-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                {item.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PRIZE_BANNERS = [
  {
    webp: '/assets/prize-pool-1.webp',
    jpeg: '/assets/prize-pool-1.jpeg',
    alt: 'T-KPL Official Tournament Poster 1',
  },
  {
    webp: '/assets/prize-pool-2.webp',
    jpeg: '/assets/prize-pool-2.jpeg',
    alt: 'T-KPL Official Tournament Poster 2',
  },
  {
    webp: '/assets/prize-pool-3.webp',
    jpeg: '/assets/prize-pool-3.jpeg',
    alt: 'T-KPL Official Tournament Poster 3',
  },
];

const PrizePool: React.FC = () => (
  <section aria-label="Tournament prizes and highlights" className="relative border-b border-white/[0.08] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
    {/* Section Header */}
    <div className="mx-auto max-w-3xl text-center mb-10">
      <div className="inline-flex items-center gap-2 rounded-full border border-brand-yellow/35 bg-brand-yellow/10 px-3.5 py-1 text-[11px] font-bold tracking-[0.24em] text-brand-yellow uppercase shadow-[0_0_20px_rgba(255,210,30,0.15)]">
        <Trophy size={14} weight="fill" className="text-brand-yellow animate-pulse" />
        <span>Championship Rewards &amp; Posters</span>
      </div>
      <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]">
        Tournament <span className="brand-text-gradient">Highlights</span>
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm sm:text-base font-medium leading-relaxed text-zinc-300">
        Official league prize pool, champion trophies, and tournament schedule posters.
      </p>
    </div>

    {/* Vertical Posters Stack */}
    <div className="mx-auto max-w-4xl space-y-8 sm:space-y-10">
      {PRIZE_BANNERS.map((banner, index) => (
        <div
          key={banner.webp}
          className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 bg-brand-surface/85 shadow-[0_16px_45px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 hover:border-brand-lime/40 hover:shadow-[0_0_35px_rgba(182,255,46,0.25)]"
        >
          <picture>
            <source srcSet={banner.webp} type="image/webp" />
            <img
              src={banner.jpeg}
              alt={banner.alt}
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.015]"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </picture>
        </div>
      ))}
    </div>
  </section>
);

interface ClosingCtaProps {
  feeFormatted: string;
  registrationOpen: boolean;
}

const ClosingCta: React.FC<ClosingCtaProps> = ({ feeFormatted, registrationOpen }) => (
  <section className="relative px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
    <div className="mx-auto max-w-4xl">
      {/* Outer ambient glow */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-r from-brand-lime/20 via-brand-yellow/15 to-rose-500/15 blur-2xl opacity-70"
        />

        {/* Pure Frosted Glass Container */}
        <div className="relative overflow-hidden rounded-3xl border border-white/25 bg-white/[0.08] px-6 py-12 text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_24px_60px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:px-12 sm:py-16">
          {/* Top Edge Specular Reflection Sheen */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
          />
          {/* Subtle inner light bloom */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-48 w-96 -translate-x-1/2 rounded-full bg-brand-lime/20 blur-3xl"
          />

          <div className="inline-flex items-center gap-2 rounded-full border border-brand-lime/40 bg-black/40 px-3.5 py-1 text-[11px] font-bold tracking-[0.24em] text-brand-lime uppercase backdrop-blur-md shadow-[0_0_15px_rgba(182,255,46,0.2)]">
            <Lightning size={14} weight="fill" />
            <span>Limited Player Slots Available</span>
          </div>

          <h2 className="mx-auto mt-4 max-w-xl font-display text-4xl sm:text-5xl lg:text-6xl uppercase leading-none font-black tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)]">
            Ready to <span className="brand-text-gradient italic drop-shadow-[0_4px_24px_rgba(182,255,46,0.35)]">join the league</span>?
          </h2>

          <p className="mx-auto mt-4 max-w-md text-sm sm:text-base font-semibold leading-relaxed text-zinc-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            Complete your player registration in 2 minutes, pay securely via UPI / Razorpay, and download your official receipt.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {registrationOpen ? (
              <Link
                to="/register"
                className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-brand-lime px-8 py-4 text-sm font-black tracking-wide text-brand-ink uppercase shadow-[0_16px_40px_-16px_rgba(182,255,46,0.95)] transition hover:brightness-110 active:scale-[0.98] sm:w-auto"
              >
                <UserPlus size={19} weight="bold" />
                <span>Register Now for {feeFormatted}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-ink/15 transition-transform group-hover:translate-x-1">
                  <ArrowRight size={14} weight="bold" />
                </span>
              </Link>
            ) : (
              <span className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-white/25 bg-black/60 px-8 py-4 text-sm font-black tracking-wide text-zinc-200 uppercase shadow-lg backdrop-blur-md sm:w-auto drop-shadow-md">
                Registrations closed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  </section>
);
