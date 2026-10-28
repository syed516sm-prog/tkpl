import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react';
import { ArrowRight, CalendarBlank, MagnifyingGlass, Trophy, UserPlus } from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import { formatInrFromPaise } from '../../core/lib/validation';
import { BRAND_LOGO_SRC } from '../../core/components/BrandLogo';
import { OrganizerShowcase } from '../../core/components/OrganizerShowcase';

export const HomePage: React.FC = () => {
  const { settings, players, payments } = useTournament();
  const preferReducedMotion = useReducedMotion();

  const feeFormatted = formatInrFromPaise(settings.fee_paise);
  const registeredCount = players.length;

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
    <div className="overflow-x-hidden bg-brand-ink text-zinc-100">
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
        registeredCount={registeredCount}
      />

      <PrizePool />

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
    <section className="relative isolate overflow-hidden border-b border-brand-line/70 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-20 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(182,255,46,0.20),transparent_65%),radial-gradient(ellipse_45%_40%_at_85%_15%,rgba(255,210,30,0.14),transparent_60%),radial-gradient(ellipse_50%_45%_at_15%_75%,rgba(225,29,72,0.14),transparent_65%)]"
      />
      {!reduceMotion && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span className="brand-beam absolute -top-24 left-[12%] h-[62%] w-24 origin-top rotate-[16deg]" />
          <span className="brand-beam absolute -top-24 left-1/2 h-[70%] w-32 -translate-x-1/2" />
          <span className="brand-beam absolute -top-24 right-[12%] h-[62%] w-24 origin-top -rotate-[16deg]" />
        </div>
      )}

      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white/[0.03] px-3 py-1 text-[10px] font-semibold tracking-[0.24em] text-brand-muted uppercase sm:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-lime shadow-[0_0_8px_rgba(182,255,46,0.9)]" />
            {season}
          </span>

          <h1 className="mt-5 font-display text-4xl leading-[1.05] font-black tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
            Tennis Ball
            <span className="mt-1 block brand-text-gradient">Kadapa</span>
            <span className="mt-1 block text-white">Premier League</span>
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-brand-muted sm:text-base lg:mx-0">
            New &amp; Old Kadapa players only. Register your player profile, pay the
            entry fee online and get your official receipt instantly.
          </p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
            {registrationOpen ? (
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-lime px-6 py-3.5 text-sm font-black tracking-wide text-brand-ink uppercase shadow-[0_16px_40px_-16px_rgba(182,255,46,0.85)] transition hover:brightness-110 active:scale-[0.98]"
              >
                <UserPlus size={19} weight="bold" />
                <span>Register Now @ {feeFormatted}/-</span>
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-brand-line bg-white/[0.04] px-6 py-3.5 text-sm font-black tracking-wide text-brand-muted uppercase"
              >
                Registrations closed
              </span>
            )}

            <Link
              to="/find-ticket"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-line bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-zinc-100 transition hover:border-brand-lime/50 hover:bg-white/[0.06]"
            >
              <MagnifyingGlass size={17} weight="bold" />
              <span>Find My Ticket</span>
            </Link>
          </div>

          {registrationOpen && deadlineLabel && (
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand-muted">
              <CalendarBlank size={14} />
              <span>Entries close {deadlineLabel}</span>
            </p>
          )}
        </div>

        <div
          className="order-1 lg:order-2"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div
            className="relative mx-auto w-full max-w-[520px]"
            style={{ perspective: '1200px' }}
          >
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-brand-lime/15 blur-3xl"
              style={reduceMotion ? undefined : { left: glowX }}
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
                  className="w-full drop-shadow-[0_28px_56px_rgba(182,255,46,0.16)]"
                  draggable={false}
                />
              </div>
            </motion.div>
            <div
              aria-hidden="true"
              className="mx-auto mt-2 h-6 w-3/5 rounded-[50%] bg-brand-lime/15 blur-2xl"
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
    { label: 'Player Entry Fee', value: `${feeFormatted}/-`, sub: 'Official tournament registration' },
    {
      label: 'Registered Players',
      value: String(registeredCount),
      sub: 'Confirmed tournament entries',
    },
  ];

  return (
    <section className="border-b border-brand-line/70 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-brand-line bg-brand-line">
        {items.map((item) => (
          <div key={item.label} className="bg-brand-surface px-4 py-5 sm:px-6 sm:py-6">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-brand-muted uppercase">
              {item.label}
            </p>
            <p className="mt-2 font-display text-xl font-black tracking-tight text-white tabular-nums sm:text-2xl">
              {item.value}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">{item.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const PrizePool: React.FC = () => (
  <section className="border-b border-brand-line/70 px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
        Prize pool
      </h2>
      <p className="mt-2 text-sm text-brand-muted">
        Prize money grows further as additional sponsors join the league.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-yellow/30 bg-gradient-to-br from-brand-yellow/[0.10] to-transparent px-5 py-5">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-brand-yellow uppercase">
              Champions
            </p>
            <p className="mt-1 font-display text-3xl font-black tracking-tight text-white">
              ₹2,00,000
            </p>
            <p className="mt-1 text-xs text-zinc-400">Plus the winner&#39;s trophy</p>
          </div>
          <Trophy size={30} weight="duotone" className="shrink-0 text-brand-yellow" />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-lime/25 bg-gradient-to-br from-brand-lime/[0.08] to-transparent px-5 py-5">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-brand-lime uppercase">
              Runners-up
            </p>
            <p className="mt-1 font-display text-3xl font-black tracking-tight text-white">
              ₹1,50,000
            </p>
            <p className="mt-1 text-xs text-zinc-400">Plus the runners-up trophy</p>
          </div>
          <Trophy size={30} weight="duotone" className="shrink-0 text-brand-lime" />
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-400">
          <span className="font-semibold text-white">Man of the Series ₹5,000/-</span> and
          a Man of the Match award in every single game.
        </p>
    </div>
  </section>
);

interface ClosingCtaProps {
  feeFormatted: string;
  registrationOpen: boolean;
}

const ClosingCta: React.FC<ClosingCtaProps> = ({ feeFormatted, registrationOpen }) => (
  <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="rounded-3xl border border-brand-line bg-brand-surface/60 px-6 py-10 text-center sm:px-10">
        <h2 className="mx-auto max-w-xl font-display text-2xl leading-tight font-black tracking-tight text-white sm:text-3xl">
          Ready to <span className="brand-text-gradient">join the league</span>?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-brand-muted">
          Complete your player profile, pay online securely, and download your official receipt
          and entry pass anytime.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {registrationOpen ? (
            <Link
              to="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-lime px-6 py-3.5 text-sm font-black tracking-wide text-brand-ink uppercase transition hover:brightness-110 active:scale-[0.98] sm:w-auto"
            >
              <UserPlus size={18} weight="bold" />
              <span>Register for {feeFormatted}</span>
            </Link>
          ) : (
            <span className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-brand-line px-6 py-3.5 text-sm font-black tracking-wide text-brand-muted uppercase sm:w-auto">
              Registrations closed
            </span>
          )}
        </div>
      </div>
    </div>
  </section>
);
